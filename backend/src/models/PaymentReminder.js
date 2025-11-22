const mongoose = require('mongoose');

const paymentReminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Название обязательно'],
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    // ДОБАВЛЕНЫ 'credit', 'rent' и другие возможные типы
    enum: ['other', 'utility', 'service', 'subscription', 'credit', 'rent'], 
    default: 'other'
  },
  description: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  dayOfMonth: { 
    type: Number,
    min: 1,
    max: 31
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentReminder', paymentReminderSchema);