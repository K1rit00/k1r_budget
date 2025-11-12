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
      required: [true, 'Дата закрытия обязательна'],
      validate: {
        validator: function(value) {
          return value > this.startDate;
        },
        message: 'Дата закрытия должна быть после даты открытия'
      }
    },
    type: {
      type: String,
      enum: ['fixed', 'savings', 'investment'],
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
    }
  },
  {
    timestamps: true
  }
);

// Индексы для оптимизации запросов
depositSchema.index({ userId: 1, status: 1 });
depositSchema.index({ userId: 1, startDate: -1 });

module.exports = mongoose.model('Deposit', depositSchema);