const mongoose = require('mongoose');

const creditPaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  credit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Credit',
    required: [true, 'Кредит обязателен'],
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
    index: true
  },
  principalAmount: {
    type: Number,
    required: true,
    min: [0, 'Сумма основного долга не может быть отрицательной'],
    default: 0
  },
  interestAmount: {
    type: Number,
    required: true,
    min: [0, 'Сумма процентов не может быть отрицательной'],
    default: 0
  },
  status: {
    type: String,
    enum: {
      values: ['paid', 'pending', 'cancelled'],
      message: 'Недопустимый статус платежа'
    },
    default: 'paid',
    index: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Примечания не могут быть длиннее 500 символов'],
    trim: true
  },
  // Зашифрованные данные
  encryptedReceiptNumber: {
    type: String
  }
}, {
  timestamps: true
});

// Составные индексы
creditPaymentSchema.index({ user: 1, credit: 1 });
creditPaymentSchema.index({ user: 1, paymentDate: -1 });
creditPaymentSchema.index({ credit: 1, paymentDate: -1 });
creditPaymentSchema.index({ user: 1, status: 1 });

// Валидация: сумма = основной долг + проценты
creditPaymentSchema.pre('validate', function(next) {
  const totalCalculated = this.principalAmount + this.interestAmount;
  const difference = Math.abs(totalCalculated - this.amount);
  
  // Допускаем погрешность в 0.01 из-за округления
  if (difference > 0.01) {
    this.amount = totalCalculated;
  }
  
  next();
});

// Статический метод для получения платежей по кредиту
creditPaymentSchema.statics.getByCreditId = async function(creditId, userId) {
  return this.find({ 
    credit: creditId, 
    user: userId 
  }).sort({ paymentDate: -1 });
};

// Статический метод для получения общей суммы выплат
creditPaymentSchema.statics.getTotalPaid = async function(creditId, userId) {
  const result = await this.aggregate([
    { 
      $match: { 
        credit: mongoose.Types.ObjectId(creditId),
        user: mongoose.Types.ObjectId(userId),
        status: 'paid'
      } 
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalPrincipal: { $sum: '$principalAmount' },
        totalInterest: { $sum: '$interestAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    totalAmount: 0,
    totalPrincipal: 0,
    totalInterest: 0,
    count: 0
  };
};

// Статический метод для получения истории платежей за период
creditPaymentSchema.statics.getPaymentHistory = async function(userId, startDate, endDate) {
  const match = { 
    user: userId,
    status: 'paid'
  };
  
  if (startDate || endDate) {
    match.paymentDate = {};
    if (startDate) match.paymentDate.$gte = new Date(startDate);
    if (endDate) match.paymentDate.$lte = new Date(endDate);
  }
  
  return this.find(match)
    .populate('credit')
    .sort({ paymentDate: -1 });
};

const CreditPayment = mongoose.model('CreditPayment', creditPaymentSchema);

module.exports = CreditPayment;