const MonthlyExpense = require('../models/MonthlyExpense');
const Category = require('../models/Category');
const Income = require('../models/Income');
const Deposit = require('../models/Deposit');
const IncomeUsage = require('../models/IncomeUsage');
const DepositTransaction = require('../models/DepositTransaction'); 
const ExpenseTransaction = require('../models/ExpenseTransaction');

// @desc    Получить все ежемесячные расходы
// @route   GET /api/v1/monthly-expenses
// @access  Private

// @desc    Получить историю оплат расходов
// @route   GET /api/v1/monthly-expenses/transactions/history
// @access  Private
exports.getExpenseTransactionsHistory = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { userId: req.user.id };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const transactions = await ExpenseTransaction.find(query)
            .populate({
                path: 'expenseId',
                select: 'name category',
                populate: { path: 'category', select: 'name color icon' }
            })
            .sort({ date: -1 }); // Сначала новые

        res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        console.error('Error getting expense history:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения истории', error: error.message });
    }
};

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

    if (sourceIncome && storageDeposit) {
      const income = await Income.findOne({ _id: sourceIncome, userId: req.user.id });
      if (!income) return res.status(400).json({ success: false, message: 'Источник дохода не найден' });

      const currentAvailable = income.availableAmount !== undefined ? income.availableAmount : income.amount;

      if (currentAvailable < parseFloat(amount)) {
        return res.status(400).json({ success: false, message: 'Недостаточно свободных средств в выбранном доходе' });
      }

      const deposit = await Deposit.findOne({ _id: storageDeposit, userId: req.user.id });
      if (!deposit) return res.status(400).json({ success: false, message: 'Депозит хранения не найден' });

      if (income.availableAmount !== undefined) {
        income.availableAmount -= parseFloat(amount);
      } else {
        income.availableAmount = income.amount - parseFloat(amount);
      }
      income.usedAmount = (income.usedAmount || 0) + parseFloat(amount);
      await income.save();

      deposit.currentBalance += parseFloat(amount);
      await deposit.save();

      const transaction = await DepositTransaction.create({
        userId: req.user.id,
        depositId: deposit._id,
        type: 'deposit',
        amount: parseFloat(amount),
        transactionDate: new Date(),
        description: `Резерв под расход: ${name}`,
        incomeId: income._id
      });

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

// === НОВАЯ ФУНКЦИЯ ===
// @desc    Перенести регулярные расходы на следующий месяц
// @route   POST /api/v1/monthly-expenses/transfer
// @access  Private
exports.transferRecurringExpenses = async (req, res) => {
  try {
    const { sourceIncomeId, currentMonthDate } = req.body; // currentMonthDate: "2023-10-01"

    if (!sourceIncomeId) {
      return res.status(400).json({ success: false, message: 'Не выбран источник финансирования' });
    }

    const currentDate = new Date(currentMonthDate || new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 1. Определяем диапазон текущего месяца для поиска
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    // 2. Определяем дату следующего месяца (для новых расходов)
    // Новая дата будет последним числом СЛЕДУЮЩЕГО месяца
    const nextMonthDate = new Date(year, month + 2, 0, 12, 0, 0); 

    // 3. Находим регулярные расходы в этом месяце
    const recurringExpenses = await MonthlyExpense.find({
      userId: req.user.id,
      dueDate: { $gte: startOfMonth, $lte: endOfMonth },
      isRecurring: true
    });

    if (recurringExpenses.length === 0) {
      return res.status(400).json({ success: false, message: 'Нет регулярных расходов для переноса' });
    }

    // 4. Получаем источник дохода
    const income = await Income.findOne({ _id: sourceIncomeId, userId: req.user.id });
    if (!income) {
      return res.status(404).json({ success: false, message: 'Источник дохода не найден' });
    }

    // 5. Рассчитываем общую сумму для переноса
    const totalNeeded = recurringExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const incomeAvailable = income.availableAmount !== undefined ? income.availableAmount : income.amount;

    if (incomeAvailable < totalNeeded) {
      return res.status(400).json({ 
        success: false, 
        message: `Недостаточно средств. Требуется: ${totalNeeded}, Доступно: ${incomeAvailable}` 
      });
    }

    // 6. Выполняем перенос
    let processedCount = 0;

    for (const expense of recurringExpenses) {
      // Проверяем, не создан ли уже такой расход на следующий месяц (защита от дублей)
      // Ищем расход с таким же именем, категорией и датой в следующем месяце
      const nextMonthStart = new Date(year, month + 1, 1);
      const nextMonthEnd = new Date(year, month + 2, 0, 23, 59, 59);
      
      const existingDuplicate = await MonthlyExpense.findOne({
        userId: req.user.id,
        name: expense.name,
        category: expense.category,
        dueDate: { $gte: nextMonthStart, $lte: nextMonthEnd }
      });

      if (existingDuplicate) continue;

      // 6.1 Списываем с дохода
      const amount = parseFloat(expense.amount);
      
      // Обновляем доход
      if (income.availableAmount !== undefined) {
        income.availableAmount -= amount;
      } else {
        income.availableAmount = income.amount - amount;
      }
      income.usedAmount = (income.usedAmount || 0) + amount;
      
      // 6.2 Пополняем депозит расхода
      if (expense.storageDeposit) {
        const deposit = await Deposit.findOne({ _id: expense.storageDeposit, userId: req.user.id });
        if (deposit) {
          deposit.currentBalance += amount;
          await deposit.save();

          // Транзакция пополнения депозита
          const transaction = await DepositTransaction.create({
            userId: req.user.id,
            depositId: deposit._id,
            type: 'deposit',
            amount: amount,
            transactionDate: new Date(),
            description: `Авто-перенос: ${expense.name} (на след. месяц)`,
            incomeId: income._id
          });

           // Запись об использовании дохода
          await IncomeUsage.create({
            userId: req.user.id,
            incomeId: income._id,
            usedAmount: amount,
            usageType: 'deposit',
            depositTransactionId: transaction._id,
            description: `Перенос бюджета: ${expense.name}`,
            usageDate: new Date()
          });
        }
      }

      // 6.3 Создаем новый расход
      await MonthlyExpense.create({
        userId: req.user.id,
        category: expense.category,
        name: expense.name,
        amount: expense.amount, // зашифруется в pre-save
        dueDate: nextMonthDate,
        isRecurring: true,
        status: 'planned',
        description: expense.description,
        sourceIncome: income._id,
        storageDeposit: expense.storageDeposit,
        actualAmount: null
      });

      processedCount++;
    }

    // Сохраняем изменения дохода один раз после цикла (или внутри, если критично, но здесь income один)
    await income.save();

    res.status(200).json({
      success: true,
      message: `Успешно перенесено ${processedCount} расходов`,
      transferredCount: processedCount
    });

  } catch (error) {
    console.error('Error transferring expenses:', error);
    res.status(500).json({ success: false, message: 'Ошибка переноса расходов', error: error.message });
  }
};

// @desc    Обновить расход
// @route   PUT /api/v1/monthly-expenses/:id
// @access  Private
exports.updateMonthlyExpense = async (req, res) => {
  try {
    let expense = await MonthlyExpense.findOne({ _id: req.params.id, userId: req.user.id });
    if (!expense) return res.status(404).json({ success: false, message: 'Расход не найден' });

    // === ЛОГИКА ОПЛАТЫ И ТРАНЗАКЦИЙ ===
    if (req.body.actualAmount !== undefined) {
      const oldActual = expense.actualAmount ? parseFloat(expense.actualAmount) : 0;
      const newActual = parseFloat(req.body.actualAmount);
      const difference = newActual - oldActual;

      // Если сумма увеличилась (была оплата)
      if (difference > 0) {
        let depositTransactionId = null;
        let paymentSource = 'external';

        // 1. Пробуем списать с депозита (старая логика)
        const depositId = req.body.storageDeposit || expense.storageDeposit;
        if (depositId) {
          const deposit = await Deposit.findOne({ _id: depositId, userId: req.user.id });
          if (deposit) {
            // Если денег хватает, списываем
            if (deposit.currentBalance >= difference) {
                deposit.currentBalance -= difference;
                await deposit.save();

                // Создаем транзакцию списания депозита
                const depTrans = await DepositTransaction.create({
                  userId: req.user.id,
                  depositId: deposit._id,
                  type: 'withdrawal',
                  amount: difference,
                  transactionDate: new Date(),
                  description: `Оплата расхода: ${expense.name}`
                });
                
                depositTransactionId = depTrans._id;
                paymentSource = 'deposit';
            } 
            // Если денег на депозите не хватает, но пользователь все равно вносит оплату 
            // (значит платит "из кармана"), мы не трогаем депозит, но создаем ExpenseTransaction ниже.
          }
        }

        // 2. ВСЕГДА создаем запись в новой модели ExpenseTransaction
        await ExpenseTransaction.create({
            userId: req.user.id,
            expenseId: expense._id,
            amount: difference,
            date: req.body.date || new Date(), // Берем дату из тела запроса или текущую
            description: req.body.description || `Оплата: ${expense.name}`,
            paymentSource: paymentSource,
            relatedDepositTransactionId: depositTransactionId
        });
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
