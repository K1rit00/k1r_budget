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
  }
}, {
  timestamps: true
});

// Indexes
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, type: 1 });

// Encrypt amount before saving
incomeSchema.pre('save', function(next) {
  if (this.isModified('amount') && !this.amount.includes('=')) {
    this.amount = encryptionService.encrypt(this.amount.toString());
  }
  next();
});

// Decrypt amount after finding
incomeSchema.post('find', function(docs) {
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

incomeSchema.post('findOne', function(doc) {
  if (doc && doc.amount) {
    try {
      doc.amount = encryptionService.decrypt(doc.amount);
    } catch (e) {
      console.error('Decryption error:', e);
    }
  }
});

module.exports = mongoose.model('Income', incomeSchema);