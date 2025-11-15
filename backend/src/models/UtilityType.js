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
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Уникальность по связке userId + name
utilityTypeSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('UtilityType', utilityTypeSchema);