const mongoose = require('mongoose');
const encryptionService = require('../services/encryptionService');

const recurringIncomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  source: {
    type: String,
    required: [true, 'Источник дохода обязателен'],
    trim: true
  },
  amount: {
    type: String, // Encrypted
    required: [true, 'Сумма обязательна']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Тип дохода обязателен']
  },
  recurringDay: {
    type: Number,
    required: [true, 'День повторения обязателен'],
    min: [1, 'День должен быть от 1 до 31'],
    max: [31, 'День должен быть от 1 до 31']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoCreate: {
    type: Boolean,
    default: true
  },
  lastCreated: {
    month: {
      type: Number
    },
    year: {
      type: Number
    }
  },
  createdIncomes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Income'
    }
  ]
}, {
  timestamps: true
});

// Индексы для оптимизации
recurringIncomeSchema.index({ userId: 1, recurringDay: 1 });
recurringIncomeSchema.index({ userId: 1, type: 1 });

// Функция проверки шифрования (как в Income.js)
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 100;
}

// Безопасная расшифровка
function safeDecrypt(value) {
  if (!value || !isEncrypted(value)) return value;
  try {
    return encryptionService.decrypt(value);
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

// Шифрование amount перед сохранением
recurringIncomeSchema.pre('save', function(next) {
  if (this.isModified('amount') && !isEncrypted(this.amount)) {
    try {
      this.amount = encryptionService.encrypt(this.amount.toString());
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Обработка обновлений
recurringIncomeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  const amountUpdate = update.$set?.amount || update.amount;
  
  if (amountUpdate && !isEncrypted(amountUpdate)) {
    try {
      const encrypted = encryptionService.encrypt(amountUpdate.toString());
      if (update.$set) {
        update.$set.amount = encrypted;
      } else {
        update.amount = encrypted;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Расшифровка после нахождения
recurringIncomeSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.amount) doc.amount = safeDecrypt(doc.amount);
    });
  }
});

recurringIncomeSchema.post('findOne', function(doc) {
  if (doc && doc.amount) {
    doc.amount = safeDecrypt(doc.amount);
  }
});

recurringIncomeSchema.post('findOneAndUpdate', function(doc) {
  if (doc && doc.amount) {
    doc.amount = safeDecrypt(doc.amount);
  }
});

module.exports = mongoose.model('RecurringIncome', recurringIncomeSchema);