const mongoose = require('mongoose');

const depositTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Пожалуйста, укажите пользователя']
    },
    depositId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deposit',
      required: [true, 'ID депозита обязателен']
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'interest'],
      required: [true, 'Тип транзакции обязателен']
    },
    amount: {
      type: Number,
      required: [true, 'Сумма обязательна'],
      min: [0, 'Сумма не может быть отрицательной']
    },
    transactionDate: {
      type: Date,
      required: [true, 'Дата транзакции обязательна'],
      default: Date.now
    },
    description: {
      type: String,
      maxlength: [500, 'Описание не может быть длиннее 500 символов']
    },
    incomeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Income',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Индексы
depositTransactionSchema.index({ userId: 1, depositId: 1, transactionDate: -1 });
depositTransactionSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('DepositTransaction', depositTransactionSchema);