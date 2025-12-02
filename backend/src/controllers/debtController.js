const Debt = require('../models/Debt');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../middleware/errorHandler');

// @desc    Get all debts for user
// @route   GET /api/v1/debts
// @access  Private
exports.getDebts = asyncHandler(async (req, res, next) => {
  const { type, status } = req.query;
  
  const query = { userId: req.user.id };
  
  if (type) {
    query.type = type;
  }
  
  if (status) {
    query.status = status;
  }
  
  const debts = await Debt.find(query).sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: debts.length,
    data: { debts }
  });
});

// @desc    Get single debt
// @route   GET /api/v1/debts/:id
// @access  Private
exports.getDebt = asyncHandler(async (req, res, next) => {
  const debt = await Debt.findById(req.params.id);
  
  if (!debt) {
    return next(new ErrorResponse(`Долг с ID ${req.params.id} не найден`, 404));
  }
  
  // Проверка владельца
  if (debt.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Нет доступа к этому долгу', 403));
  }
  
  res.status(200).json({
    success: true,
    data: { debt }
  });
});

// @desc    Create new debt
// @route   POST /api/v1/debts
// @access  Private
exports.createDebt = asyncHandler(async (req, res, next) => {
  req.body.userId = req.user.id;
  
  // Устанавливаем currentBalance равным amount при создании
  if (!req.body.currentBalance) {
    req.body.currentBalance = req.body.amount;
  }
  
  const debt = await Debt.create(req.body);
  
  res.status(201).json({
    success: true,
    data: { debt }
  });
});

// @desc    Update debt
// @route   PUT /api/v1/debts/:id
// @access  Private
exports.updateDebt = asyncHandler(async (req, res, next) => {
  let debt = await Debt.findById(req.params.id);
  
  if (!debt) {
    return next(new ErrorResponse(`Долг с ID ${req.params.id} не найден`, 404));
  }
  
  // Проверка владельца
  if (debt.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Нет доступа к этому долгу', 403));
  }
  
  debt = await Debt.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: { debt }
  });
});

// @desc    Delete debt
// @route   DELETE /api/v1/debts/:id
// @access  Private
exports.deleteDebt = asyncHandler(async (req, res, next) => {
  const debt = await Debt.findById(req.params.id);
  
  if (!debt) {
    return next(new ErrorResponse(`Долг с ID ${req.params.id} не найден`, 404));
  }
  
  // Проверка владельца
  if (debt.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Нет доступа к этому долгу', 403));
  }
  
  await debt.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add payment to debt
// @route   POST /api/v1/debts/:id/payments
// @access  Private
exports.addPayment = asyncHandler(async (req, res, next) => {
  const debt = await Debt.findById(req.params.id);
  
  if (!debt) {
    return next(new ErrorResponse(`Долг с ID ${req.params.id} не найден`, 404));
  }
  
  // Проверка владельца
  if (debt.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Нет доступа к этому долгу', 403));
  }
  
  const { amount, description, paymentDate } = req.body;
  
  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Сумма платежа должна быть больше нуля', 400));
  }
  
  if (amount > debt.currentBalance) {
    return next(new ErrorResponse('Сумма платежа не может превышать остаток долга', 400));
  }
  
  // Добавляем платеж
  const payment = {
    amount,
    description,
    paymentDate: paymentDate || new Date()
  };
  
  debt.payments.push(payment);
  debt.currentBalance -= amount;
  
  // Автоматически меняем статус
  if (debt.currentBalance === 0) {
    debt.status = 'paid';
  }
  
  await debt.save();
  
  res.status(200).json({
    success: true,
    data: { debt }
  });
});

// @desc    Get debt payments
// @route   GET /api/v1/debts/:id/payments
// @access  Private
exports.getPayments = asyncHandler(async (req, res, next) => {
  const debt = await Debt.findById(req.params.id);
  
  if (!debt) {
    return next(new ErrorResponse(`Долг с ID ${req.params.id} не найден`, 404));
  }
  
  // Проверка владельца
  if (debt.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Нет доступа к этому долгу', 403));
  }
  
  res.status(200).json({
    success: true,
    count: debt.payments.length,
    data: { payments: debt.payments }
  });
});

// @desc    Delete payment from debt
// @route   DELETE /api/v1/debts/:id/payments/:paymentId
// @access  Private
exports.deletePayment = asyncHandler(async (req, res, next) => {
  const debt = await Debt.findById(req.params.id);
  
  if (!debt) {
    return next(new ErrorResponse(`Долг с ID ${req.params.id} не найден`, 404));
  }
  
  // Проверка владельца
  if (debt.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Нет доступа к этому долгу', 403));
  }
  
  const payment = debt.payments.id(req.params.paymentId);
  
  if (!payment) {
    return next(new ErrorResponse(`Платеж с ID ${req.params.paymentId} не найден`, 404));
  }
  
  // Возвращаем сумму обратно к балансу
  debt.currentBalance += payment.amount;
  debt.status = 'active';
  
  payment.deleteOne();
  await debt.save();
  
  res.status(200).json({
    success: true,
    data: { debt }
  });
});

// @desc    Get debt statistics
// @route   GET /api/v1/debts/statistics
// @access  Private
exports.getStatistics = asyncHandler(async (req, res, next) => {
  const debts = await Debt.find({ userId: req.user.id });
  
  const statistics = {
    totalOwe: 0,
    totalOwed: 0,
    activeOwe: 0,
    activeOwed: 0,
    paidDebts: 0,
    netBalance: 0
  };
  
  debts.forEach(debt => {
    if (debt.type === 'owe') {
      if (debt.status === 'active') {
        statistics.totalOwe += debt.currentBalance;
        statistics.activeOwe++;
      }
    } else {
      if (debt.status === 'active') {
        statistics.totalOwed += debt.currentBalance;
        statistics.activeOwed++;
      }
    }
    
    if (debt.status === 'paid') {
      statistics.paidDebts++;
    }
  });
  
  statistics.netBalance = statistics.totalOwed - statistics.totalOwe;
  
  res.status(200).json({
    success: true,
    data: { statistics }
  });
});