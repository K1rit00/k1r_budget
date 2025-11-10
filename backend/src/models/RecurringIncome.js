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
    type: String,
    enum: ['salary', 'bonus', 'investment', 'freelance', 'other'],
    default: 'salary'
  },
  // Настройки повторения
  recurringDay: {
    type: Number,
    required: [true, 'День месяца обязателен для регулярного дохода'],
    min: 1,
    max: 31
  },
  // Активность шаблона
  isActive: {
    type: Boolean,
    default: true
  },
  // Отслеживание последнего создания
  lastCreated: {
    month: Number, // 0-11
    year: Number
  },
  // История созданных доходов
  createdIncomes: [{
    incomeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Income'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    amount: String, // На случай если сумма изменилась
    month: Number,
    year: Number
  }],
  // Дополнительные настройки
  autoCreate: {
    type: Boolean,
    default: true
  },
  notifyBeforeCreation: {
    type: Boolean,
    default: false
  },
  // Даты начала и окончания (опционально)
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
recurringIncomeSchema.index({ userId: 1, isActive: 1 });
recurringIncomeSchema.index({ userId: 1, recurringDay: 1 });
recurringIncomeSchema.index({ 'lastCreated.year': 1, 'lastCreated.month': 1 });

// Проверка, зашифрованы ли данные
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 100;
}

// Encrypt amount before saving
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

// Также обрабатываем updates
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

// Методы для работы с шаблоном
recurringIncomeSchema.methods.shouldCreateThisMonth = function() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  
  // Проверяем, активен ли шаблон
  if (!this.isActive || !this.autoCreate) return false;
  
  // Проверяем даты начала/окончания
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  
  // Проверяем, наступил ли нужный день
  if (currentDay < this.recurringDay) return false;
  
  // Проверяем, не создавали ли уже в этом месяце
  if (this.lastCreated && 
      this.lastCreated.month === currentMonth && 
      this.lastCreated.year === currentYear) {
    return false;
  }
  
  return true;
};

recurringIncomeSchema.methods.markAsCreated = function(incomeId, month, year) {
  this.lastCreated = { month, year };
  this.createdIncomes.push({
    incomeId,
    amount: this.amount,
    month,
    year,
    createdAt: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('RecurringIncome', recurringIncomeSchema);