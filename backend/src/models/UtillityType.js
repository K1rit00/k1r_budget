const mongoose = require('mongoose');

const utilityTypeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Название типа услуги обязательно'],
    trim: true,
    maxlength: [100, 'Название не может быть длиннее 100 символов']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  icon: {
    type: String,
    default: 'zap'
  },
  color: {
    type: String,
    default: '#10b981'
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

utilityTypeSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('UtilityType', utilityTypeSchema);