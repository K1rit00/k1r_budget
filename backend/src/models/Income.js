const mongoose = require('mongoose');
const encryptionService = require('../services/encryptionService');

const incomeSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // ИЗМЕНЕНО: теперь type - это ссылка на Category
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  // Ссылка на шаблон регулярного дохода (если создан автоматически)
  recurringIncomeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringIncome'
  },
  isAutoCreated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, type: 1 });
incomeSchema.index({ recurringIncomeId: 1 });

// Проверка, зашифрованы ли данные
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 100;
}

// Encrypt amount before saving
incomeSchema.pre('save', function(next) {
  if (this.isModified('amount') && !isEncrypted(this.amount)) {
    try {
      this.amount = encryptionService.encrypt(this.amount.toString());
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Также обрабатываем updates
incomeSchema.pre('findOneAndUpdate', function(next) {
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

// Decrypt amount after finding
incomeSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.amount) doc.amount = safeDecrypt(doc.amount);
    });
  }
});

incomeSchema.post('findOne', function(doc) {
  if (doc && doc.amount) {
    doc.amount = safeDecrypt(doc.amount);
  }
});

incomeSchema.post('findOneAndUpdate', function(doc) {
  if (doc && doc.amount) {
    doc.amount = safeDecrypt(doc.amount);
  }
});

module.exports = mongoose.model('Income', incomeSchema);