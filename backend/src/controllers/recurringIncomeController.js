const RecurringIncome = require('../models/RecurringIncome');
const Income = require('../models/Income');

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
    const recurringIncomes = await RecurringIncome.find({ 
      userId: req.user.id,
      isActive: true,
      autoCreate: true
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let created = 0;
    const createdIncomes = [];

    for (const template of recurringIncomes) {
      if (template.shouldCreateThisMonth()) {
        try {
          // Создаём реальный доход
          const incomeDate = new Date(currentYear, currentMonth, template.recurringDay);
          
          const newIncome = await Income.create({
            userId: req.user.id,
            source: template.source,
            amount: template.amount, // Уже зашифрован в шаблоне
            date: incomeDate,
            type: template.type,
            description: template.description 
              ? `[AUTO] ${template.description}` 
              : '[AUTO] Автоматически созданный доход',
            recurringIncomeId: template._id,
            isAutoCreated: true
          });

          // Отмечаем в шаблоне, что доход создан
          await template.markAsCreated(newIncome._id, currentMonth, currentYear);
          
          created++;
          createdIncomes.push({
            source: template.source,
            amount: template.amount,
            date: incomeDate
          });
        } catch (error) {
          console.error(`Ошибка создания дохода из шаблона ${template._id}:`, error);
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
    }).populate('createdIncomes.incomeId');
    
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