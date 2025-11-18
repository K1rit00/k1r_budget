const RentProperty = require('../models/Rent');
const RentPayment = require('../models/RentPayment');
const IncomeUsage = require('../models/IncomeUsage'); // <--- ДОБАВЛЕНО: Импорт модели IncomeUsage
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all rent properties
// @route   GET /api/v1/rent
// @access  Private
exports.getRentProperties = asyncHandler(async (req, res) => {
  const { status, startDate, endDate } = req.query;
  
  const query = { userId: req.user.id };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }
  
  const properties = await RentProperty.find(query).sort({ createdAt: -1 });
  
  // Автоматически обновляем статус для объектов с истекшей датой окончания
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const updatedProperties = await Promise.all(
    properties.map(async (property) => {
      if (property.endDate && property.status === 'active') {
        const endDate = new Date(property.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        if (endDate < today) {
          property.status = 'completed';
          await property.save();
        }
      }
      return property;
    })
  );
  
  res.status(200).json({
    success: true,
    count: updatedProperties.length,
    data: updatedProperties
  });
});

// @desc    Get single rent property
// @route   GET /api/v1/rent/:id
// @access  Private
exports.getRentProperty = asyncHandler(async (req, res) => {
  const property = await RentProperty.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Объект недвижимости не найден'
    });
  }
  
  res.status(200).json({
    success: true,
    data: property
  });
});

// @desc    Create rent property
// @route   POST /api/v1/rent
// @access  Private
exports.createRentProperty = asyncHandler(async (req, res) => {
  req.body.userId = req.user.id;
  
  const property = await RentProperty.create(req.body);
  
  res.status(201).json({
    success: true,
    data: property
  });
});

// @desc    Update rent property
// @route   PUT /api/v1/rent/:id
// @access  Private
exports.updateRentProperty = asyncHandler(async (req, res) => {
  let property = await RentProperty.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Объект недвижимости не найден'
    });
  }
  
  // ИСПОЛЬЗУЕМ Object.assign И property.save() ВМЕСТО findByIdAndUpdate
  // Это гарантирует, что валидаторы "save" (как в Rent.js) сработают корректно
  
  // Присваиваем новые значения из req.body
  Object.assign(property, req.body);
  
  // Запускаем сохранение (и наши валидаторы)
  await property.save();
  
  res.status(200).json({
    success: true,
    data: property
  });
});

// @desc    Delete rent property
// @route   DELETE /api/v1/rent/:id
// @access  Private
exports.deleteRentProperty = asyncHandler(async (req, res) => {
  const property = await RentProperty.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Объект недвижимости не найден'
    });
  }
  
  // Удаляем также все связанные платежи
  await RentPayment.deleteMany({ 
    propertyId: req.params.id,
    userId: req.user.id 
  });
  
  await property.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get all payments
// @route   GET /api/v1/rent/payments
// @access  Private
exports.getPayments = asyncHandler(async (req, res) => {
  const { propertyId, status, paymentType, startDate, endDate } = req.query;
  
  const query = { userId: req.user.id };
  
  if (propertyId) {
    query.propertyId = propertyId;
  }
  
  if (status) {
    query.status = status;
  }
  
  if (paymentType) {
    query.paymentType = paymentType;
  }
  
  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) query.paymentDate.$lte = new Date(endDate);
  }
  
  // Включаем receiptFile в результат
  const payments = await RentPayment.find(query)
    .select('+receiptFile')
    .sort({ paymentDate: -1 });
  
  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get single payment
// @route   GET /api/v1/rent/payments/:id
// @access  Private
exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await RentPayment.findOne({
    _id: req.params.id,
    userId: req.user.id
  }).select('+receiptFile');
  
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Платеж не найден'
    });
  }
  
  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Create payment
// @route   POST /api/v1/rent/payments
// @access  Private
exports.createPayment = asyncHandler(async (req, res) => {
  // Добавляем userId
  req.body.userId = req.user.id;
  
  // Проверяем, что объект принадлежит пользователю
  const property = await RentProperty.findOne({
    _id: req.body.propertyId,
    userId: req.user.id
  });
  
  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Объект недвижимости не найден'
    });
  }
  
  // Создаем платеж аренды
  const payment = await RentPayment.create(req.body); // <--- Оставлено без изменений
  
  // >>> ИСПРАВЛЕНИЕ: Логика для сохранения использования дохода <<<
  if (req.body.incomeId) {
    try {
      await IncomeUsage.create({
        userId: req.user.id,
        incomeId: req.body.incomeId,
        usedAmount: req.body.amount,
        usageType: 'other', // Используем 'other', так как это не пополнение депозита
        description: `Оплата аренды: ${property.address} (${req.body.paymentType === 'rent' ? 'Аренда' : 'Коммунальные'})`,
        usageDate: req.body.paymentDate || Date.now()
      });
    } catch (err) {
      // Логируем ошибку, но не прерываем основной запрос создания платежа
      console.error('Ошибка при создании записи использования дохода:', err);
    }
  } // <--- КОНЕЦ ИСПРАВЛЕНИЯ
  
  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Update payment
// @route   PUT /api/v1/rent/payments/:id
// @access  Private
exports.updatePayment = asyncHandler(async (req, res) => {
  let payment = await RentPayment.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Платеж не найден'
    });
  }
  
  payment = await RentPayment.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).select('+receiptFile');
  
  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Delete payment
// @route   DELETE /api/v1/rent/payments/:id
// @access  Private
exports.deletePayment = asyncHandler(async (req, res) => {
  const payment = await RentPayment.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Платеж не найден'
    });
  }
  
  await payment.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get rent statistics
// @route   GET /api/v1/rent/statistics
// @access  Private
exports.getStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Получаем все объекты пользователя
  const userProperties = await RentProperty.find({ userId: req.user.id });
  
  // Текущий месяц
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Затраты за текущий месяц
  const currentMonthPayments = await RentPayment.find({
    userId: req.user.id,
    paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
    status: 'paid'
  });
  
  const totalExpenseThisMonth = currentMonthPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  
  // Активные объекты
  const activePropertiesCount = userProperties.filter(
    p => p.status === 'active'
  ).length;
  
  // Ожидающие платежи
  const pendingPaymentsCount = await RentPayment.countDocuments({
    userId: req.user.id,
    status: 'pending'
  });
  
  // Предстоящий платеж (сумма аренды + коммуналка активного объекта)
  const activeProperty = userProperties.find(p => p.status === 'active');
  let upcomingPaymentAmount = 0;
  
  if (activeProperty) {
    upcomingPaymentAmount = activeProperty.getTotalAmount();
  }
  
  // Данные по месяцам для графика
  const paymentsQuery = {
    userId: req.user.id,
    status: 'paid'
  };
  
  if (startDate) {
    paymentsQuery.paymentDate = { $gte: new Date(startDate) };
  }
  if (endDate) {
    paymentsQuery.paymentDate = { 
      ...paymentsQuery.paymentDate, 
      $lte: new Date(endDate) 
    };
  }
  
  const allPayments = await RentPayment.find(paymentsQuery).sort({ paymentDate: 1 });
  
  // Группируем по месяцам
  const monthlyDataMap = allPayments.reduce((acc, payment) => {
    const date = new Date(payment.paymentDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthName, rent: 0, utilities: 0, total: 0 };
    }
    
    if (payment.paymentType === 'utilities') {
      acc[monthKey].utilities += payment.amount;
    } else {
      acc[monthKey].rent += payment.amount;
    }
    acc[monthKey].total += payment.amount;
    
    return acc;
  }, {});
  
  const monthlyData = Object.values(monthlyDataMap);
  
  res.status(200).json({
    success: true,
    data: {
      totalExpenseThisMonth,
      activePropertiesCount,
      pendingPaymentsCount,
      upcomingPaymentAmount,
      monthlyData
    }
  });
});