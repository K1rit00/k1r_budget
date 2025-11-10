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
  type: {
    type: String,
    enum: ['salary', 'bonus', 'investment', 'freelance', 'other'],
    default: 'salary'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDay: {
    type: Number,
    min: 1,
    max: 31
  },
  // Флаг для отслеживания зашифрованности
  _encrypted: {
    type: Boolean,
    default: false,
    select: false
  }
}, {
  timestamps: true
});

// Indexes
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, type: 1 });

// Проверка, зашифрованы ли данные
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  
  // Проверяем формат base64 и минимальную длину зашифрованных данных
  // Зашифрованные данные: salt(64) + iv(16) + tag(16) + encrypted(минимум несколько байт)
  // В base64 это минимум ~128 символов
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 100;
}

// Encrypt amount before saving
incomeSchema.pre('save', function(next) {
  if (this.isModified('amount')) {
    // Если amount - число или строка с числом, и еще не зашифровано
    if (!isEncrypted(this.amount)) {
      try {
        this.amount = encryptionService.encrypt(this.amount.toString());
        this._encrypted = true;
      } catch (error) {
        console.error('Encryption error on save:', error);
        return next(error);
      }
    }
  }
  next();
});

// Также обрабатываем findOneAndUpdate, updateOne, updateMany
incomeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Обрабатываем разные форматы обновления
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
      console.error('Encryption error on update:', error);
      return next(error);
    }
  }
  
  next();
});

// Безопасная расшифровка
function safeDecrypt(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  // Если данные не похожи на зашифрованные, возвращаем как есть
  if (!isEncrypted(value)) {
    console.warn('Data appears to be unencrypted:', value.substring(0, 20));
    return value;
  }
  
  try {
    return encryptionService.decrypt(value);
  } catch (error) {
    console.error('Decryption error:', error.message);
    // Возвращаем original value или null, чтобы не сломать приложение
    return null;
  }
}

// Decrypt amount after finding
incomeSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.amount) {
        doc.amount = safeDecrypt(doc.amount);
      }
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