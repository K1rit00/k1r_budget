const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Название категории обязательно'],
    trim: true
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    required: true
  },
  icon: {
    type: String,
    default: 'circle'
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  budget: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);