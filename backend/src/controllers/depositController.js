const Deposit = require('../models/Deposit');
const DepositTransaction = require('../models/DepositTransaction');
const Income = require('../models/Income');
const asyncHandler = require('../middleware/asyncHandler');

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
  
  const deposits = await Deposit.find(query).sort({ createdAt: -1 });
  
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
  
  // Устанавливаем currentBalance равным начальной сумме при создании
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
  
  // Удаляем также все связанные транзакции
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
  
  // Продлеваем на 1 год
  const newStartDate = new Date();
  const newEndDate = new Date();
  newEndDate.setFullYear(newEndDate.getFullYear() + 1);
  
  deposit.startDate = newStartDate;
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
    .populate('depositId', 'bankName accountNumber')
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
  
  // Проверяем, что депозит принадлежит пользователю
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
  
  // Проверяем существование дохода, если указан incomeId
  if (req.body.incomeId) {
    const income = await Income.findOne({
      _id: req.body.incomeId,
      userId: req.user.id
    });
    
    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Доход не найден'
      });
    }
  }
  
  // Создаем транзакцию
  const transaction = await DepositTransaction.create(req.body);
  
  // Обновляем баланс депозита
  if (req.body.type === 'deposit' || req.body.type === 'interest') {
    deposit.currentBalance += req.body.amount;
  } else if (req.body.type === 'withdrawal') {
    deposit.currentBalance = Math.max(0, deposit.currentBalance - req.body.amount);
  }
  
  await deposit.save();
  
  // Получаем транзакцию с populate
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
  
  // Получаем все депозиты пользователя
  const deposits = await Deposit.find({ userId: req.user.id });
  
  // Общий баланс
  const totalBalance = deposits
    .filter(d => d.status === 'active')
    .reduce((sum, d) => sum + d.currentBalance, 0);
  
  // Транзакции для расчета дохода
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
  
  // Активные депозиты
  const activeDepositsCount = deposits.filter(d => d.status === 'active').length;
  
  // Созревшие депозиты
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