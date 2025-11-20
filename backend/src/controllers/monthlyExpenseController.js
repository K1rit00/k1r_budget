const MonthlyExpense = require('../models/MonthlyExpense');
const Category = require('../models/Category');
const Income = require('../models/Income');
const Deposit = require('../models/Deposit');
const IncomeUsage = require('../models/IncomeUsage');
const DepositTransaction = require('../models/DepositTransaction'); 

// @desc    Получить все ежемесячные расходы
// @route   GET /api/v1/monthly-expenses
// @access  Private
exports.getMonthlyExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, status, limit = 100, page = 1 } = req.query;

    const query = { userId: req.user.id };

    // Фильтр по дате
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Фильтр по категории
    if (category) {
      query.category = category;
    }

    // Фильтр по статусу
    if (status) {
      query.status = status;
    }

    const expenses = await MonthlyExpense.find(query)
      .populate('category', 'name color icon')
      .sort({ dueDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await MonthlyExpense.countDocuments(query);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: expenses
    });
  } catch (error) {
    console.error('Error getting monthly expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения расходов',
      error: error.message
    });
  }
};

// @desc    Получить один расход
// @route   GET /api/v1/monthly-expenses/:id
// @access  Private
exports.getMonthlyExpense = async (req, res) => {
  try {
    const expense = await MonthlyExpense.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('category', 'name color icon');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Расход не найден'
      });
    }

    res.status(200).json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error getting monthly expense:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения расхода',
      error: error.message
    });
  }
};

// @desc    Создать расход
// @route   POST /api/v1/monthly-expenses
// @access  Private
exports.createMonthlyExpense = async (req, res) => {
  try {
    const { amount, category: categoryId, sourceIncome, storageDeposit, name } = req.body;
    
    const category = await Category.findOne({ _id: categoryId, userId: req.user.id });
    if (!category) return res.status(400).json({ success: false, message: 'Категория не найдена' });

    // === ЛОГИКА ПЕРЕВОДА (РЕЗЕРВИРОВАНИЕ СРЕДСТВ) ===
    if (sourceIncome && storageDeposit) {
      const income = await Income.findOne({ _id: sourceIncome, userId: req.user.id });
      if (!income) return res.status(400).json({ success: false, message: 'Источник дохода не найден' });

      // Используем availableAmount или amount, если поля available нет
      const currentAvailable = income.availableAmount !== undefined ? income.availableAmount : income.amount;

      if (currentAvailable < parseFloat(amount)) {
        return res.status(400).json({ success: false, message: 'Недостаточно свободных средств в выбранном доходе' });
      }

      const deposit = await Deposit.findOne({ _id: storageDeposit, userId: req.user.id });
      if (!deposit) return res.status(400).json({ success: false, message: 'Депозит хранения не найден' });

      // 1. Вычитаем из Дохода
      if (income.availableAmount !== undefined) {
        income.availableAmount -= parseFloat(amount);
      } else {
        // Если поле не было инициализировано
        income.availableAmount = income.amount - parseFloat(amount);
      }
      income.usedAmount = (income.usedAmount || 0) + parseFloat(amount);
      await income.save();

      // 2. Прибавляем к Депозиту (откладываем)
      deposit.currentBalance += parseFloat(amount);
      await deposit.save();

      // 3. Записываем транзакцию пополнения депозита
      const transaction = await DepositTransaction.create({
        userId: req.user.id,
        depositId: deposit._id,
        type: 'deposit',
        amount: parseFloat(amount),
        transactionDate: new Date(),
        description: `Резерв под расход: ${name}`,
        incomeId: income._id
      });

      // 4. Записываем использование дохода
      await IncomeUsage.create({
        userId: req.user.id,
        incomeId: income._id,
        usedAmount: parseFloat(amount),
        usageType: 'deposit',
        depositTransactionId: transaction._id,
        description: `Использование для расхода: ${name}`,
        usageDate: new Date()
      });
    }

    req.body.userId = req.user.id;
    const expense = await MonthlyExpense.create(req.body);
    const populatedExpense = await MonthlyExpense.findById(expense._id)
      .populate('category', 'name color icon')
      .populate('storageDeposit', 'name bankName');

    res.status(201).json({ success: true, data: populatedExpense });
  } catch (error) {
    console.error('Error creating monthly expense:', error);
    res.status(400).json({ success: false, message: 'Ошибка создания расхода', error: error.message });
  }
};

// @desc    Обновить расход
// @route   PUT /api/v1/monthly-expenses/:id
// @access  Private
exports.updateMonthlyExpense = async (req, res) => {
  try {
    let expense = await MonthlyExpense.findOne({ _id: req.params.id, userId: req.user.id });
    if (!expense) return res.status(404).json({ success: false, message: 'Расход не найден' });

    // === ЛОГИКА СПИСАНИЯ С ДЕПОЗИТА ПРИ ОПЛАТЕ ===
    // Проверяем, изменилась ли фактическая сумма оплаты
    if (req.body.actualAmount !== undefined) {
      const oldActual = expense.actualAmount ? parseFloat(expense.actualAmount) : 0;
      const newActual = parseFloat(req.body.actualAmount);
      const difference = newActual - oldActual;

      // Если сумма увеличилась (мы доплатили), списываем разницу с депозита
      if (difference > 0) {
        const depositId = req.body.storageDeposit || expense.storageDeposit;
        
        if (depositId) {
          const deposit = await Deposit.findOne({ _id: depositId, userId: req.user.id });
          if (deposit) {
            if (deposit.currentBalance < difference) {
               return res.status(400).json({ success: false, message: 'На депозите недостаточно средств для оплаты' });
            }

            deposit.currentBalance -= difference;
            await deposit.save();

            // Создаем транзакцию списания
            await DepositTransaction.create({
              userId: req.user.id,
              depositId: deposit._id,
              type: 'withdrawal',
              amount: difference,
              transactionDate: new Date(),
              description: `Оплата расхода (частичная/полная): ${expense.name}`
            });
          }
        }
      }
    }

    // Стандартное обновление
    expense = await MonthlyExpense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('category', 'name color icon')
    .populate('storageDeposit', 'name bankName');

    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    console.error('Error updating monthly expense:', error);
    res.status(400).json({ success: false, message: 'Ошибка обновления расхода', error: error.message });
  }
};
// @desc    Удалить расход
// @route   DELETE /api/v1/monthly-expenses/:id
// @access  Private
exports.deleteMonthlyExpense = async (req, res) => {
  try {
    const expense = await MonthlyExpense.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Расход не найден'
      });
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Расход удален'
    });
  } catch (error) {
    console.error('Error deleting monthly expense:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления расхода',
      error: error.message
    });
  }
};

// @desc    Получить статистику по месяцам
// @route   GET /api/v1/monthly-expenses/stats/by-month
// @access  Private
exports.getMonthlyStats = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const expenses = await MonthlyExpense.find({
      userId: req.user.id,
      dueDate: { $gte: startDate }
    });

    // Группируем по месяцам
    const monthlyData = {};

    expenses.forEach(expense => {
      const date = new Date(expense.dueDate);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          planned: 0,
          actual: 0,
          count: 0
        };
      }

      monthlyData[monthKey].planned += parseFloat(expense.amount);
      monthlyData[monthKey].actual += expense.actualAmount ? parseFloat(expense.actualAmount) : 0;
      monthlyData[monthKey].count += 1;
    });

    const stats = Object.values(monthlyData).sort((a, b) => 
      a.month.localeCompare(b.month)
    );

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики',
      error: error.message
    });
  }
};

// @desc    Получить просроченные расходы
// @route   GET /api/v1/monthly-expenses/overdue
// @access  Private
exports.getOverdueExpenses = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expenses = await MonthlyExpense.find({
      userId: req.user.id,
      status: 'planned',
      dueDate: { $lt: today }
    })
    .populate('category', 'name color icon')
    .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    console.error('Error getting overdue expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения просроченных расходов',
      error: error.message
    });
  }
};

// @desc    Обновить статусы просроченных расходов
// @route   POST /api/v1/monthly-expenses/update-overdue
// @access  Private
exports.updateOverdueStatus = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await MonthlyExpense.updateMany(
      {
        userId: req.user.id,
        status: 'planned',
        dueDate: { $lt: today }
      },
      {
        $set: { status: 'overdue' }
      }
    );

    res.status(200).json({
      success: true,
      message: `Обновлено ${result.modifiedCount} расходов`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating overdue status:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления статусов',
      error: error.message
    });
  }
};
