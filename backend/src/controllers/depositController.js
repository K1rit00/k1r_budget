const Deposit = require('../models/Deposit');
const DepositTransaction = require('../models/DepositTransaction');
const Income = require('../models/Income');
const IncomeUsage = require('../models/IncomeUsage');
const asyncHandler = require('../middleware/asyncHandler');

const days30_360 = (start, end) => {
  let y1 = start.getFullYear();
  let m1 = start.getMonth() + 1;
  let d1 = start.getDate();
  let y2 = end.getFullYear();
  let m2 = end.getMonth() + 1;
  let d2 = end.getDate();

  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 === 30) d2 = 30;

  return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
};

// Вспомогательная функция для получения доступной суммы дохода
const getAvailableIncomeAmount = async (incomeId, userId) => {
  const income = await Income.findOne({ _id: incomeId, userId });
  if (!income) return 0;

  // Получаем все использования этого дохода
  const usages = await IncomeUsage.find({ incomeId, userId });
  const totalUsed = usages.reduce((sum, usage) => sum + usage.usedAmount, 0);

  // Парсим сумму дохода (она может быть зашифрована, но после расшифровки это строка)
  const incomeAmount = parseFloat(income.amount) || 0;
  
  return Math.max(0, incomeAmount - totalUsed);
};

// @desc    Get all deposits
// @route   GET /api/v1/deposits
// @access  Private
exports.getDeposits = asyncHandler(async (req, res) => {
  const { status, type } = req.query;
  
  const query = { userId: req.user.id };
  
  if (status) {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }
  
  let deposits = await Deposit.find(query).sort({ createdAt: -1 });
  
  const today = new Date();
  
  // 1. Начисление процентов для active депозитов
  for (let deposit of deposits) {
    if (deposit.status !== 'active' || !deposit.lastInterestAccrued) continue;
    
    let lastAccrued = new Date(deposit.lastInterestAccrued);
    let nextAccrualDate = new Date(lastAccrued.getFullYear(), lastAccrued.getMonth() + 1, 1);
    
    const endDateObj = new Date(deposit.endDate);
    const createdAt = new Date(deposit.createdAt);
    
    while (nextAccrualDate <= today && nextAccrualDate <= endDateObj) {
      if (nextAccrualDate < createdAt) {
        nextAccrualDate = new Date(nextAccrualDate.getFullYear(), nextAccrualDate.getMonth() + 1, 1);
        continue;
      }
      
      const monthlyRate = deposit.interestRate / 12 / 100;
      const interestAmount = Math.round(deposit.currentBalance * monthlyRate * 100) / 100;
      
      if (interestAmount <= 0) break;
      
      const transaction = new DepositTransaction({
        userId: req.user.id,
        depositId: deposit._id,
        type: 'interest',
        amount: interestAmount,
        transactionDate: nextAccrualDate,
        description: 'Автоматическое начисление процентов'
      });
      await transaction.save();
      
      deposit.currentBalance += interestAmount;
      deposit.lastInterestAccrued = nextAccrualDate;
      
      nextAccrualDate = new Date(nextAccrualDate.getFullYear(), nextAccrualDate.getMonth() + 1, 1);
    }
    
    await deposit.save();
  }
  
  // 2. Проверка maturity и autoRenewal
  for (let deposit of deposits) {
    const endDateObj = new Date(deposit.endDate);
    if (deposit.status === 'active' && endDateObj <= today) {
      if (deposit.autoRenewal) {
        const newEndDate = new Date(deposit.endDate);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        
        deposit.endDate = newEndDate;
        deposit.status = 'active';
        
        await deposit.save();
      } else {
        deposit.status = 'matured';
        await deposit.save();
      }
    }
  }
  
  deposits = await Deposit.find(query).sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: deposits.length,
    data: deposits
  });
});

// @desc    Get single deposit
// @route   GET /api/v1/deposits/:id
// @access  Private
exports.getDeposit = asyncHandler(async (req, res) => {
  const deposit = await Deposit.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: 'Депозит не найден'
    });
  }
  
  res.status(200).json({
    success: true,
    data: deposit
  });
});

// @desc    Create deposit
// @route   POST /api/v1/deposits
// @access  Private
exports.createDeposit = asyncHandler(async (req, res) => {
  req.body.userId = req.user.id;
  
  if (!req.body.currentBalance) {
    req.body.currentBalance = req.body.amount;
  }
  
  const deposit = await Deposit.create(req.body);
  
  res.status(201).json({
    success: true,
    data: deposit
  });
});

// @desc    Update deposit
// @route   PUT /api/v1/deposits/:id
// @access  Private
exports.updateDeposit = asyncHandler(async (req, res) => {
  let deposit = await Deposit.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: 'Депозит не найден'
    });
  }
  
  if (req.body.currentBalance === undefined) {
    req.body.currentBalance = deposit.currentBalance;
  }
  
  const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date(deposit.startDate);
  const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date(deposit.endDate);
  
  if (endDate <= startDate) {
    return res.status(400).json({
      success: false,
      message: 'Дата закрытия должна быть после даты открытия'
    });
  }
  
  deposit = await Deposit.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: deposit
  });
});

// @desc    Delete deposit
// @route   DELETE /api/v1/deposits/:id
// @access  Private
exports.deleteDeposit = asyncHandler(async (req, res) => {
  const deposit = await Deposit.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: 'Депозит не найден'
    });
  }
  
  // Удаляем все связанные транзакции
  const transactions = await DepositTransaction.find({ 
    depositId: req.params.id,
    userId: req.user.id 
  });
  
  // Удаляем все использования доходов, связанные с этими транзакциями
  for (const transaction of transactions) {
    await IncomeUsage.deleteMany({
      depositTransactionId: transaction._id,
      userId: req.user.id
    });
  }
  
  await DepositTransaction.deleteMany({ 
    depositId: req.params.id,
    userId: req.user.id 
  });
  
  await deposit.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Close deposit
// @route   PATCH /api/v1/deposits/:id/close
// @access  Private
exports.closeDeposit = asyncHandler(async (req, res) => {
  const deposit = await Deposit.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: 'Депозит не найден'
    });
  }
  
  deposit.status = 'closed';
  await deposit.save();
  
  res.status(200).json({
    success: true,
    data: deposit
  });
});

// @desc    Renew deposit
// @route   PATCH /api/v1/deposits/:id/renew
// @access  Private
exports.renewDeposit = asyncHandler(async (req, res) => {
  const deposit = await Deposit.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: 'Депозит не найден'
    });
  }
  
  const newEndDate = new Date(deposit.endDate);
  newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  
  deposit.endDate = newEndDate;
  deposit.status = 'active';
  
  await deposit.save();
  
  res.status(200).json({
    success: true,
    data: deposit
  });
});

// @desc    Get all deposit transactions
// @route   GET /api/v1/deposits/transactions
// @access  Private
exports.getTransactions = asyncHandler(async (req, res) => {
  const { depositId, type, startDate, endDate } = req.query;
  
  const query = { userId: req.user.id };
  
  if (depositId) {
    query.depositId = depositId;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) query.transactionDate.$lte = new Date(endDate);
  }
  
  const transactions = await DepositTransaction.find(query)
    .populate('depositId', 'bankName accountNumber type')
    .populate('incomeId', 'source amount date')
    .sort({ transactionDate: -1 });
  
  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions
  });
});

// @desc    Get single transaction
// @route   GET /api/v1/deposits/transactions/:id
// @access  Private
exports.getTransaction = asyncHandler(async (req, res) => {
  const transaction = await DepositTransaction.findOne({
    _id: req.params.id,
    userId: req.user.id
  })
    .populate('depositId', 'bankName accountNumber')
    .populate('incomeId', 'source amount date');
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Транзакция не найдена'
    });
  }
  
  res.status(200).json({
    success: true,
    data: transaction
  });
});

// @desc    Create deposit transaction
// @route   POST /api/v1/deposits/transactions
// @access  Private
exports.createTransaction = asyncHandler(async (req, res) => {
  req.body.userId = req.user.id;
  
  const deposit = await Deposit.findOne({
    _id: req.body.depositId,
    userId: req.user.id
  });
  
  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: 'Депозит не найден'
    });
  }
  
  // Проверка снятия средств
  if (req.body.type === 'withdrawal' && req.body.amount > deposit.currentBalance) {
    return res.status(400).json({
      success: false,
      message: `Нельзя снять больше, чем остаток на балансе депозита (${deposit.currentBalance.toLocaleString('kk-KZ')} ₸)`
    });
  }
  
  let incomeToUse = null;
  
  // Обработка связи с доходом (только для пополнений)
  if (req.body.type === 'deposit' && req.body.incomeId && req.body.incomeId !== 'none') {
    incomeToUse = await Income.findOne({
      _id: req.body.incomeId,
      userId: req.user.id
    });
    
    if (!incomeToUse) {
      return res.status(404).json({
        success: false,
        message: 'Доход не найден'
      });
    }
    
    // Проверяем доступную сумму дохода
    const availableAmount = await getAvailableIncomeAmount(req.body.incomeId, req.user.id);
    
    if (req.body.amount > availableAmount) {
      return res.status(400).json({
        success: false,
        message: `Недостаточно средств в выбранном доходе. Доступно: ${availableAmount.toLocaleString('kk-KZ')} ₸`
      });
    }
  }
  
  // Создаем транзакцию
  const transaction = await DepositTransaction.create(req.body);
  
  // Если использовался доход, создаем запись об использовании
  if (incomeToUse && req.body.type === 'deposit') {
    await IncomeUsage.create({
      userId: req.user.id,
      incomeId: req.body.incomeId,
      usedAmount: req.body.amount,
      usageType: 'deposit',
      depositTransactionId: transaction._id,
      description: `Пополнение депозита ${deposit.bankName} - ${deposit.accountNumber}`,
      usageDate: req.body.transactionDate || new Date()
    });
  }
  
  // Обновляем баланс депозита
  if (req.body.type === 'deposit' || req.body.type === 'interest') {
    deposit.currentBalance += req.body.amount;
  } else if (req.body.type === 'withdrawal') {
    deposit.currentBalance = Math.max(0, deposit.currentBalance - req.body.amount);
  }
  
  await deposit.save();
  
  const populatedTransaction = await DepositTransaction.findById(transaction._id)
    .populate('depositId', 'bankName accountNumber')
    .populate('incomeId', 'source amount date');
  
  res.status(201).json({
    success: true,
    data: populatedTransaction
  });
});

// @desc    Update deposit transaction
// @route   PUT /api/v1/deposits/transactions/:id
// @access  Private
exports.updateTransaction = asyncHandler(async (req, res) => {
  let transaction = await DepositTransaction.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Транзакция не найдена'
    });
  }
  
  const deposit = await Deposit.findById(transaction.depositId);
  
  // Откатываем старую транзакцию
  if (transaction.type === 'deposit' || transaction.type === 'interest') {
    deposit.currentBalance -= transaction.amount;
  } else if (transaction.type === 'withdrawal') {
    deposit.currentBalance += transaction.amount;
  }
  
  // Если была связь с доходом, откатываем использование
  if (transaction.incomeId) {
    await IncomeUsage.deleteMany({
      depositTransactionId: transaction._id,
      userId: req.user.id
    });
  }
  
  // Применяем новую транзакцию
  const newAmount = req.body.amount || transaction.amount;
  const newType = req.body.type || transaction.type;
  
  if (newType === 'deposit' || newType === 'interest') {
    deposit.currentBalance += newAmount;
  } else if (newType === 'withdrawal') {
    if (newAmount > deposit.currentBalance) {
      return res.status(400).json({
        success: false,
        message: 'Недостаточно средств на депозите'
      });
    }
    deposit.currentBalance -= newAmount;
  }
  
  // Если указан новый доход
  if (req.body.incomeId && req.body.incomeId !== 'none' && newType === 'deposit') {
    const availableAmount = await getAvailableIncomeAmount(req.body.incomeId, req.user.id);
    
    if (newAmount > availableAmount) {
      return res.status(400).json({
        success: false,
        message: `Недостаточно средств в выбранном доходе. Доступно: ${availableAmount.toLocaleString('kk-KZ')} ₸`
      });
    }
    
    await IncomeUsage.create({
      userId: req.user.id,
      incomeId: req.body.incomeId,
      usedAmount: newAmount,
      usageType: 'deposit',
      depositTransactionId: transaction._id,
      description: `Обновлено: Пополнение депозита`,
      usageDate: req.body.transactionDate || transaction.transactionDate
    });
  }
  
  await deposit.save();
  
  transaction = await DepositTransaction.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('depositId', 'bankName accountNumber')
    .populate('incomeId', 'source amount date');
  
  res.status(200).json({
    success: true,
    data: transaction
  });
});

// @desc    Delete deposit transaction
// @route   DELETE /api/v1/deposits/transactions/:id
// @access  Private
exports.deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await DepositTransaction.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Транзакция не найдена'
    });
  }
  
  // Удаляем использование дохода
  await IncomeUsage.deleteMany({
    depositTransactionId: transaction._id,
    userId: req.user.id
  });
  
  // Откатываем транзакцию из баланса депозита
  const deposit = await Deposit.findById(transaction.depositId);
  
  if (deposit) {
    if (transaction.type === 'deposit' || transaction.type === 'interest') {
      deposit.currentBalance = Math.max(0, deposit.currentBalance - transaction.amount);
    } else if (transaction.type === 'withdrawal') {
      deposit.currentBalance += transaction.amount;
    }
    
    await deposit.save();
  }
  
  await transaction.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get deposit statistics
// @route   GET /api/v1/deposits/statistics
// @access  Private
exports.getStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const deposits = await Deposit.find({ userId: req.user.id });
  
  const totalBalance = deposits
    .filter(d => d.status === 'active')
    .reduce((sum, d) => sum + d.currentBalance, 0);
  
  const transactionQuery = {
    userId: req.user.id,
    type: 'interest'
  };
  
  if (startDate) {
    transactionQuery.transactionDate = { $gte: new Date(startDate) };
  }
  if (endDate) {
    transactionQuery.transactionDate = { 
      ...transactionQuery.transactionDate, 
      $lte: new Date(endDate) 
    };
  }
  
  const interestTransactions = await DepositTransaction.find(transactionQuery);
  
  const totalInterestEarned = interestTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );
  
  const activeDepositsCount = deposits.filter(d => d.status === 'active').length;
  
  const today = new Date();
  const maturedDepositsCount = deposits.filter(
    d => d.status === 'active' && new Date(d.endDate) <= today
  ).length;
  
  res.status(200).json({
    success: true,
    data: {
      totalBalance,
      totalInterestEarned,
      activeDepositsCount,
      maturedDepositsCount
    }
  });
});

// @desc    Get available incomes (с остатками)
// @route   GET /api/v1/deposits/available-incomes
// @access  Private
exports.getAvailableIncomes = asyncHandler(async (req, res) => {
  // Получаем все доходы пользователя
  const allIncomes = await Income.find({ userId: req.user.id }).sort({ date: -1 });
  
  // Группируем по типу и берем самую свежую запись для каждого типа
  const latestIncomesByType = {};
  
  for (const income of allIncomes) {
    const type = income.type || 'other';
    if (!latestIncomesByType[type]) {
      latestIncomesByType[type] = income;
    }
  }
  
  // Получаем доступные суммы для каждого дохода
  const incomesWithAvailability = await Promise.all(
    Object.values(latestIncomesByType).map(async (income) => {
      const availableAmount = await getAvailableIncomeAmount(income._id, req.user.id);
      const incomeAmount = parseFloat(income.amount) || 0;
      
      return {
        _id: income._id,
        id: income._id,
        source: income.source,
        amount: incomeAmount,
        availableAmount,
        usedAmount: incomeAmount - availableAmount,
        date: income.date,
        type: income.type,
        description: income.description
      };
    })
  );
  
  // Фильтруем только те, у которых есть доступная сумма
  const availableIncomes = incomesWithAvailability.filter(
    income => income.availableAmount > 0
  );
  
  res.status(200).json({
    success: true,
    count: availableIncomes.length,
    data: availableIncomes
  });
});