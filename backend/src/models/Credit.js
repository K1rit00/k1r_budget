const mongoose = require('mongoose');

const creditSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Название кредита обязательно'],
    trim: true,
    maxlength: [200, 'Название не может быть длиннее 200 символов']
  },
  bank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bank',
    required: [true, 'Банк обязателен'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Сумма кредита обязательна'],
    min: [0, 'Сумма не может быть отрицательной']
  },
  currentBalance: {
    type: Number,
    required: true,
    min: [0, 'Текущий баланс не может быть отрицательным']
  },
  interestRate: {
    type: Number,
    required: [true, 'Процентная ставка обязательна'],
    min: [0, 'Процентная ставка не может быть отрицательной'],
    max: [100, 'Процентная ставка не может превышать 100%']
  },
  // НОВЫЕ ПОЛЯ
  isOldCredit: {
    type: Boolean,
    default: false
  },
  initialDebt: {
    type: Number,
    min: [0, 'Текущая задолженность не может быть отрицательной'],
    validate: {
      validator: function(value) {
        // Проверяем только если это старый кредит и значение указано
        if (this.isOldCredit && value !== undefined && value !== null) {
          return value <= this.amount;
        }
        return true;
      },
      message: 'Текущая задолженность не может превышать сумму кредита'
    }
  },
  monthlyPayment: {
    type: Number,
    required: [true, 'Ежемесячный платеж обязателен'],
    min: [0, 'Ежемесячный платеж не может быть отрицательным']
  },
  monthlyPaymentDate: {
    type: Number,
    required: [true, 'День ежемесячного платежа обязателен'],
    min: [1, 'День должен быть от 1 до 31'],
    max: [31, 'День должен быть от 1 до 31']
  },
  startDate: {
    type: Date,
    required: [true, 'Дата начала обязательна']
  },
  endDate: {
    type: Date,
    required: [true, 'Дата окончания обязательна'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'Дата окончания должна быть после даты начала'
    }
  },
  type: {
    type: String,
    enum: {
      values: ['credit', 'loan', 'installment'],
      message: 'Недопустимый тип кредита'
    },
    required: [true, 'Тип кредита обязателен'],
    default: 'credit'
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'paid', 'overdue', 'cancelled'],
      message: 'Недопустимый статус кредита'
    },
    default: 'active',
    index: true
  },
  description: {
    type: String,
    maxlength: [500, 'Описание не может быть длиннее 500 символов'],
    trim: true
  },
  encryptedAccountNumber: {
    type: String
  },
  encryptedContractNumber: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Индексы для оптимизации запросов
creditSchema.index({ user: 1, status: 1 });
creditSchema.index({ user: 1, bank: 1 });
creditSchema.index({ user: 1, endDate: 1 });
creditSchema.index({ user: 1, monthlyPaymentDate: 1 });

// Виртуальное поле для расчета общей переплаты
creditSchema.virtual('totalInterest').get(function() {
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  monthsDiff -= startDate.getMonth();
  monthsDiff += endDate.getMonth();
  monthsDiff = Math.max(monthsDiff, 0);
  
  if (monthsDiff === 0) return 0;
  
  const totalPayments = this.monthlyPayment * monthsDiff;
  const totalInterest = totalPayments - this.amount;
  
  return totalInterest > 0 ? totalInterest : 0;
});

// Виртуальное поле для расчета прогресса погашения
creditSchema.virtual('paymentProgress').get(function() {
  if (this.amount === 0) return 0;
  const paidAmount = this.amount - this.currentBalance;
  return (paidAmount / this.amount) * 100;
});

// Виртуальное поле для расчета оставшихся месяцев
creditSchema.virtual('remainingMonths').get(function() {
  const now = new Date();
  const endDate = new Date(this.endDate);
  
  if (endDate <= now) return 0;
  
  let monthsDiff = (endDate.getFullYear() - now.getFullYear()) * 12;
  monthsDiff -= now.getMonth();
  monthsDiff += endDate.getMonth();
  
  return Math.max(monthsDiff, 0);
});

// Middleware для автоматического обновления статуса
creditSchema.pre('save', function(next) {

  if (this.isNew) {
    if (this.isOldCredit && this.initialDebt !== undefined) {
      this.currentBalance = this.initialDebt;
    } else {
      this.currentBalance = this.amount;
    }
  } else {
    if (this.isModified('isOldCredit') || this.isModified('initialDebt')) {
      
      if (this.isOldCredit && this.initialDebt !== undefined) {
        this.currentBalance = this.initialDebt;
      } 
      else if (!this.isOldCredit) {
        this.initialDebt = undefined;
      }
    }
  }
  if (this.isOldCredit && this.initialDebt === undefined) {
    this.initialDebt = this.currentBalance;
  }
  if (this.currentBalance === 0 && this.status === 'active') {
    this.status = 'paid';
  }
  const now = new Date();
  const endDate = new Date(this.endDate);
  if (now > endDate && this.currentBalance > 0 && this.status === 'active') {
    this.status = 'overdue';
  }
  
  next();
});

// Метод для расчета следующей даты платежа
creditSchema.methods.getNextPaymentDate = function() {
  const today = new Date();
  const currentDay = today.getDate();
  const paymentDay = this.monthlyPaymentDate;
  
  let nextPaymentDate;
  
  if (currentDay < paymentDay) {
    nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
  } else {
    nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDay);
  }
  
  return nextPaymentDate;
};

// Метод для расчета дней до следующего платежа
creditSchema.methods.getDaysUntilNextPayment = function() {
  const today = new Date();
  const nextPayment = this.getNextPaymentDate();
  
  const diffTime = nextPayment.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Статический метод для получения активных кредитов с платежами в ближайшие дни
creditSchema.statics.getUpcomingPayments = async function(userId, daysAhead = 7) {
  const credits = await this.find({
    user: userId,
    status: 'active'
  }).populate('bank');
  
  return credits.filter(credit => {
    const daysUntil = credit.getDaysUntilNextPayment();
    return daysUntil <= daysAhead && daysUntil >= 0;
  });
};

// Статический метод для получения статистики по кредитам
creditSchema.statics.getStatistics = async function(userId) {
  const credits = await this.find({ user: userId });
  
  const activeCredits = credits.filter(c => c.status === 'active');
  
  const totalDebt = activeCredits.reduce((sum, c) => sum + c.currentBalance, 0);
  const monthlyPayments = activeCredits.reduce((sum, c) => sum + c.monthlyPayment, 0);
  const totalInterest = activeCredits.reduce((sum, c) => sum + c.totalInterest, 0);
  const totalAmount = activeCredits.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = totalAmount - totalDebt;
  
  return {
    totalCredits: credits.length,
    activeCredits: activeCredits.length,
    paidCredits: credits.filter(c => c.status === 'paid').length,
    overdueCredits: credits.filter(c => c.status === 'overdue').length,
    totalDebt,
    monthlyPayments,
    totalInterest,
    totalAmount,
    totalPaid,
    averageProgress: activeCredits.length > 0 
      ? activeCredits.reduce((sum, c) => sum + c.paymentProgress, 0) / activeCredits.length 
      : 0
  };
};

const Credit = mongoose.model('Credit', creditSchema);

module.exports = Credit;