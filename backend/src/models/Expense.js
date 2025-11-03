const mongoose = require('mongoose');
const encryptionService = require('../services/encryptionService');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: [true, 'Категория обязательна'],
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
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'other'],
    default: 'card'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

// Encrypt amount before saving
expenseSchema.pre('save', function(next) {
  if (this.isModified('amount') && !this.amount.includes('=')) {
    this.amount = encryptionService.encrypt(this.amount.toString());
  }
  next();
});

// Decrypt amount after finding
expenseSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.amount) {
        try {
          doc.amount = encryptionService.decrypt(doc.amount);
        } catch (e) {
          console.error('Decryption error:', e);
        }
      }
    });
  }
});

expenseSchema.post('findOne', function(doc) {
  if (doc && doc.amount) {
    try {
      doc.amount = encryptionService.decrypt(doc.amount);
    } catch (e) {
      console.error('Decryption error:', e);
    }
  }
});

module.exports = mongoose.model('Expense', expenseSchema);