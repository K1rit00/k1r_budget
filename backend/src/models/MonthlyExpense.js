const mongoose = require('mongoose');
const encryptionService = require('../services/encryptionService');

const monthlyExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Категория обязательна']
  },
  name: {
    type: String,
    required: [true, 'Название расхода обязательно'],
    trim: true,
    maxlength: 200
  },
  amount: {
    type: String, // Encrypted
    required: [true, 'Сумма обязательна']
  },
  actualAmount: {
    type: String, // Encrypted, optional
    default: null
  },
  dueDate: {
    type: Date,
    required: [true, 'Дата обязательна']
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['planned', 'paid', 'overdue'],
    default: 'planned'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  sourceIncome: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Income',
    default: null
  },
  storageDeposit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposit',
    default: null
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Индексы
monthlyExpenseSchema.index({ userId: 1, dueDate: -1 });
monthlyExpenseSchema.index({ userId: 1, status: 1 });
monthlyExpenseSchema.index({ userId: 1, category: 1 });

// Шифрование перед сохранением
monthlyExpenseSchema.pre('save', function(next) {
  if (this.isModified('amount') && !this.amount.includes('=')) {
    this.amount = encryptionService.encrypt(this.amount.toString());
  }
  if (this.isModified('actualAmount') && this.actualAmount && !this.actualAmount.includes('=')) {
    this.actualAmount = encryptionService.encrypt(this.actualAmount.toString());
  }
  next();
});

// Расшифровка после получения
monthlyExpenseSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.amount) {
        try {
          doc.amount = encryptionService.decrypt(doc.amount);
        } catch (e) {
          console.error('Decryption error:', e);
        }
      }
      if (doc.actualAmount) {
        try {
          doc.actualAmount = encryptionService.decrypt(doc.actualAmount);
        } catch (e) {
          console.error('Decryption error:', e);
        }
      }
    });
  }
});

monthlyExpenseSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.amount) {
      try {
        doc.amount = encryptionService.decrypt(doc.amount);
      } catch (e) {
        console.error('Decryption error:', e);
      }
    }
    if (doc.actualAmount) {
      try {
        doc.actualAmount = encryptionService.decrypt(doc.actualAmount);
      } catch (e) {
        console.error('Decryption error:', e);
      }
    }
  }
});

module.exports = mongoose.model('MonthlyExpense', monthlyExpenseSchema);