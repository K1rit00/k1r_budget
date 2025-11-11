const mongoose = require('mongoose');

const rentPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentProperty',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Сумма платежа обязательна'],
    min: [0, 'Сумма не может быть отрицательной']
  },
  paymentDate: {
    type: Date,
    required: [true, 'Дата платежа обязательна'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'overdue', 'cancelled'],
    default: 'paid'
  },
  paymentType: {
    type: String,
    enum: ['rent', 'utilities', 'deposit', 'other'],
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  receiptFile: {
    type: String, // Base64 encoded file
    select: false // Не возвращаем по умолчанию для оптимизации
  },
  receiptFileName: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
rentPaymentSchema.index({ userId: 1, paymentDate: -1 });
rentPaymentSchema.index({ propertyId: 1, paymentDate: -1 });
rentPaymentSchema.index({ userId: 1, status: 1 });
rentPaymentSchema.index({ userId: 1, paymentType: 1 });

// Middleware для проверки существования property
rentPaymentSchema.pre('save', async function(next) {
  const RentProperty = mongoose.model('RentProperty');
  const property = await RentProperty.findOne({
    _id: this.propertyId,
    userId: this.userId
  });
  
  if (!property) {
    throw new Error('Объект недвижимости не найден');
  }
  
  next();
});

const RentPayment = mongoose.model('RentPayment', rentPaymentSchema);

module.exports = RentPayment;