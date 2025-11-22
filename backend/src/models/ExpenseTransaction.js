const mongoose = require('mongoose');

const ExpenseTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonthlyExpense',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  // Полезно знать, откуда была оплата (депозит или наличные/карта вне системы)
  paymentSource: {
    type: String,
    enum: ['deposit', 'external'], 
    default: 'external'
  },
  relatedDepositTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DepositTransaction'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExpenseTransaction', ExpenseTransactionSchema);