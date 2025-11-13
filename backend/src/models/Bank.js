const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Название банка обязательно'],
    trim: true,
    maxlength: [200, 'Название не может быть длиннее 200 символов']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

bankSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Bank', bankSchema);