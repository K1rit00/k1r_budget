const mongoose = require('mongoose');

const debtPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Сумма платежа обязательна'],
    min: [0, 'Сумма не может быть отрицательной']
  },
  paymentDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Дата платежа обязательна']
  },
  description: {
    type: String,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  }
}, {
  timestamps: true
});

const debtSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Пожалуйста, укажите пользователя']
    },
    type: {
      type: String,
      enum: {
        values: ['owe', 'owed'],
        message: 'Тип должен быть "owe" (я должен) или "owed" (мне должны)'
      },
      required: [true, 'Тип долга обязателен']
    },
    person: {
      type: String,
      required: [true, 'Имя кредитора/должника обязательно'],
      trim: true,
      maxlength: [200, 'Имя не может быть длиннее 200 символов']
    },
    amount: {
      type: Number,
      required: [true, 'Изначальная сумма долга обязательна'],
      min: [0, 'Сумма не может быть отрицательной']
    },
    currentBalance: {
      type: Number,
      required: [true, 'Текущий остаток обязателен'],
      min: [0, 'Остаток не может быть отрицательным']
    },
    description: {
      type: String,
      maxlength: [500, 'Описание не может быть длиннее 500 символов']
    },
    dueDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'paid'],
      default: 'active'
    },
    payments: [debtPaymentSchema],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Валидация: currentBalance не может превышать amount
debtSchema.pre('save', function(next) {
  if (this.currentBalance > this.amount) {
    return next(new Error('Текущий остаток не может превышать изначальную сумму'));
  }
  
  // Автоматически обновляем статус
  if (this.currentBalance === 0) {
    this.status = 'paid';
  } else {
    this.status = 'active';
  }
  
  next();
});

// Индексы для оптимизации запросов
debtSchema.index({ userId: 1, status: 1 });
debtSchema.index({ userId: 1, type: 1 });
debtSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model('Debt', debtSchema);