const mongoose = require('mongoose');

const utilityItemSchema = new mongoose.Schema({
  utilityTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UtilityType',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

const rentPropertySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  address: {
    type: String,
    required: [true, 'Адрес обязателен'],
    trim: true
  },
  ownerName: {
    type: String,
    required: [true, 'Имя владельца обязательно'],
    trim: true
  },
  rentAmount: {
    type: Number,
    required: [true, 'Арендная плата обязательна'],
    min: [0, 'Арендная плата не может быть отрицательной']
  },
  deposit: {
    type: Number,
    required: [true, 'Залог обязателен'],
    min: [0, 'Залог не может быть отрицательным']
  },
  startDate: {
    type: Date,
    required: [true, 'Дата начала аренды обязательна']
  },
  endDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return !value || value > this.startDate;
      },
      message: 'Дата окончания должна быть после даты начала'
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  utilitiesIncluded: {
    type: Boolean,
    default: false
  },
  utilitiesType: {
    type: String,
    enum: ['included', 'fixed', 'variable'],
    default: 'variable'
  },
  utilities: [utilityItemSchema],
  utilitiesAmount: {
    type: Number,
    min: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  tenants: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
rentPropertySchema.index({ userId: 1, status: 1 });
rentPropertySchema.index({ userId: 1, startDate: -1 });

// Виртуальное поле для платежей
rentPropertySchema.virtual('payments', {
  ref: 'RentPayment',
  localField: '_id',
  foreignField: 'propertyId'
});

// Метод для расчета общей суммы с коммуналкой
rentPropertySchema.methods.getTotalAmount = function () {
  if (this.utilitiesType === 'included') {
    return this.rentAmount;
  }
  if (this.utilitiesType === 'fixed' && this.utilitiesAmount) {
    return this.rentAmount + this.utilitiesAmount;
  }
  return this.rentAmount;
};

rentPropertySchema.pre('save', function(next) {
  if (this.endDate && this.status === 'active') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(this.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    if (endDate < today) {
      this.status = 'completed';
    }
  }
  next();
});

const RentProperty = mongoose.model('RentProperty', rentPropertySchema);

module.exports = RentProperty;