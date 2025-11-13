const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Код валюты обязателен'],
    trim: true,
    uppercase: true,
    maxlength: [10, 'Код не может быть длиннее 10 символов']
  },
  name: {
    type: String,
    required: [true, 'Название валюты обязательно'],
    trim: true,
    maxlength: [100, 'Название не может быть длиннее 100 символов']
  },
  symbol: {
    type: String,
    required: [true, 'Символ валюты обязателен'],
    trim: true,
    maxlength: [10, 'Символ не может быть длиннее 10 символов']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  exchangeRate: {
    type: Number,
    default: 1,
    min: [0, 'Курс обмена не может быть отрицательным']
  }
}, {
  timestamps: true
});

currencySchema.index({ userId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Currency', currencySchema);