const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Пожалуйста, укажите пользователя']
    },
    bankName: {
      type: String,
      required: [true, 'Название банка обязательно'],
      trim: true,
      maxlength: [200, 'Название банка не может быть длиннее 200 символов']
    },
    accountNumber: {
      type: String,
      required: [true, 'Номер счета обязателен'],
      trim: true,
      maxlength: [100, 'Номер счета не может быть длиннее 100 символов']
    },
    amount: {
      type: Number,
      required: [true, 'Сумма депозита обязательна'],
      min: [0, 'Сумма не может быть отрицательной']
    },
    currentBalance: {
      type: Number,
      required: [true, 'Текущий баланс обязателен'],
      min: [0, 'Баланс не может быть отрицательным']
    },
    interestRate: {
      type: Number,
      required: [true, 'Процентная ставка обязательна'],
      min: [0, 'Процентная ставка не может быть отрицательной'],
      max: [100, 'Процентная ставка не может превышать 100%']
    },
    startDate: {
      type: Date,
      required: [true, 'Дата открытия обязательна']
    },
    endDate: {
      type: Date,
      required: [true, 'Дата закрытия обязательна']
    },
    type: {
      type: String,
      enum: {
        values: ['fixed', 'savings', 'investment', 'spending'],
        message: 'Недопустимый тип депозита'
      },
      required: [true, 'Тип депозита обязателен']
    },
    autoRenewal: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'matured', 'closed'],
      default: 'active'
    },
    description: {
      type: String,
      maxlength: [500, 'Описание не может быть длиннее 500 символов']
    },
    lastInterestAccrued: {
      type: Date
    },
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

// Валидация дат и установка lastInterestAccrued - выполняется перед сохранением
depositSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.isNew) {
    // Устанавливаем lastInterestAccrued: если startDate в будущем - с startDate, иначе с текущего момента
    const start = new Date(this.startDate);
    this.lastInterestAccrued = start > now ? start : now;
  }

  if (this.endDate && this.startDate) {
    if (this.endDate <= this.startDate) {
      return next(new Error('Дата закрытия должна быть после даты открытия'));
    }
  }
  next();
});

// Валидация дат при обновлении через findOneAndUpdate
depositSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Получаем текущие значения или значения из update
  const startDate = update.startDate || update.$set?.startDate;
  const endDate = update.endDate || update.$set?.endDate;
  
  // Если обновляются обе даты, проверяем их
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) {
      return next(new Error('Дата закрытия должна быть после даты открытия'));
    }
  }
  
  next();
});

// Индексы для оптимизации запросов
depositSchema.index({ userId: 1, status: 1 });
depositSchema.index({ userId: 1, startDate: -1 });

module.exports = mongoose.model('Deposit', depositSchema);