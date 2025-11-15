const RecurringIncome = require('../models/RecurringIncome');
const Income = require('../models/Income');


async function updateRecurringIncomeCreationInfo(template, incomeId, month, year) {
  try {
    // Обновляем дату последнего создания
    template.lastCreated = {
      month: month,
      year: year
    };

    // Добавляем ID дохода в историю
    if (!template.createdIncomes) {
      template.createdIncomes = [];
    }
    template.createdIncomes.push(incomeId);

    // Сохраняем изменения в шаблоне
    await template.save();

  } catch (error) {
    // Логгируем ошибку, но не прерываем основной процесс,
    // так как доход уже был создан.
    console.error(
      `Критическая ошибка: Не удалось обновить шаблон ${template._id} 
       после создания дохода ${incomeId}:`,
      error.message
    );
  }
}

// Получить все шаблоны регулярных доходов
exports.getRecurringIncomes = async (req, res) => {
  try {
    const recurringIncomes = await RecurringIncome.find({
      userId: req.user.id
    }).sort({ recurringDay: 1 });

    res.status(200).json({
      success: true,
      count: recurringIncomes.length,
      data: recurringIncomes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения регулярных доходов',
      error: error.message
    });
  }
};

// Получить один шаблон
exports.getRecurringIncome = async (req, res) => {
  try {
    const recurringIncome = await RecurringIncome.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!recurringIncome) {
      return res.status(404).json({
        success: false,
        message: 'Регулярный доход не найден'
      });
    }

    res.status(200).json({ success: true, data: recurringIncome });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения регулярного дохода',
      error: error.message
    });
  }
};

// Создать шаблон регулярного дохода
exports.createRecurringIncome = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    const recurringIncome = await RecurringIncome.create(req.body);

    res.status(201).json({ success: true, data: recurringIncome });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ошибка создания регулярного дохода',
      error: error.message
    });
  }
};

// Обновить шаблон
exports.updateRecurringIncome = async (req, res) => {
  try {
    let recurringIncome = await RecurringIncome.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!recurringIncome) {
      return res.status(404).json({
        success: false,
        message: 'Регулярный доход не найден'
      });
    }

    recurringIncome = await RecurringIncome.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: recurringIncome });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ошибка обновления регулярного дохода',
      error: error.message
    });
  }
};

// Удалить шаблон
exports.deleteRecurringIncome = async (req, res) => {
  try {
    const recurringIncome = await RecurringIncome.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!recurringIncome) {
      return res.status(404).json({
        success: false,
        message: 'Регулярный доход не найден'
      });
    }

    await recurringIncome.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Регулярный доход удален'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления регулярного дохода',
      error: error.message
    });
  }
};

// Переключить активность шаблона
exports.toggleRecurringIncome = async (req, res) => {
  try {
    const recurringIncome = await RecurringIncome.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!recurringIncome) {
      return res.status(404).json({
        success: false,
        message: 'Регулярный доход не найден'
      });
    }

    recurringIncome.isActive = !recurringIncome.isActive;
    await recurringIncome.save();

    res.status(200).json({
      success: true,
      data: recurringIncome,
      message: `Регулярный доход ${recurringIncome.isActive ? 'активирован' : 'деактивирован'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка изменения статуса',
      error: error.message
    });
  }
};

// Проверить и создать доходы для всех активных шаблонов
exports.processRecurringIncomes = async (req, res) => {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();
    let created = 0;
    const createdIncomes = [];

    // Находим все активные шаблоны для автоматического создания, которые должны сработать сегодня или раньше в этом месяце.
    const templatesToProcess = await RecurringIncome.find({
      userId: req.user.id,
      isActive: true,
      autoCreate: true,
      recurringDay: { $lte: currentDay }
    });

    for (const template of templatesToProcess) {
      const incomeDate = new Date(currentYear, currentMonth, template.recurringDay);

      // Проверить, был ли уже создан доход в этом месяце
      if (
        template.lastCreated?.month !== currentMonth ||
        template.lastCreated?.year !== currentYear
      ) {
        try {
          // --- ИСПРАВЛЕНИЕ: ПРОВЕРКА ВАЛИДНОСТИ СУММЫ ---
          const amountValue = parseFloat(template.amount);

          if (isNaN(amountValue) || amountValue <= 0) {
            console.error(
              `Пропущен шаблон ${template._id} (${template.source}): Некорректная сумма (${template.amount}) после дешифровки или сумма не положительна.`
            );
            // Переходим к следующему шаблону
            continue;
          }
          // ----------------------------------------------

          const newIncome = new Income({
            userId: req.user.id,
            source: template.source,
            amount: template.amount, // Дешифрованная сумма-строка
            description: template.description,
            date: incomeDate,
            type: template.type,
            recurringIncomeId: template._id,
            isAutoCreated: true,
          });

          await newIncome.save();

          // Обновление шаблона (lastCreated и createdCount)
          await updateRecurringIncomeCreationInfo(template, newIncome._id, currentMonth, currentYear);

          created++;
          createdIncomes.push({
            source: template.source,
            amount: template.amount,
            date: incomeDate
          });
        } catch (error) {
          console.error(`Ошибка создания дохода из шаблона ${template._id}:`, error.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: created > 0
        ? `Автоматически создано доходов: ${created}`
        : 'Нет доходов для создания',
      created,
      data: createdIncomes
    });
  } catch (error) {
    // Внешний try-catch перехватывает общие ошибки, не связанные с конкретным шаблоном
    console.error('Критическая ошибка обработки регулярных доходов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обработки регулярных доходов',
      error: error.message
    });
  }
};

// Получить историю созданных доходов для шаблона
exports.getCreatedIncomesHistory = async (req, res) => {
  try {
    const recurringIncome = await RecurringIncome.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('createdIncomes');

    if (!recurringIncome) {
      return res.status(404).json({
        success: false,
        message: 'Регулярный доход не найден'
      });
    }

    res.status(200).json({
      success: true,
      data: recurringIncome.createdIncomes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории',
      error: error.message
    });
  }
};