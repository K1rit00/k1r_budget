const mongoose = require('mongoose');

/**
 * Модель для отслеживания использования доходов
 * Когда доход используется для пополнения депозита, создается запись здесь
 */
const incomeUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    incomeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Income',
      required: true,
      index: true
    },
    // Сумма, которая была использована из этого дохода
    usedAmount: {
      type: Number,
      required: [true, 'Использованная сумма обязательна'],
      min: [0, 'Использованная сумма не может быть отрицательной']
    },
    // Куда был использован доход
    usageType: {
      type: String,
      enum: ['deposit', 'other'],
      default: 'deposit'
    },
    // ID связанной транзакции депозита (если применимо)
    depositTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DepositTransaction',
      index: true
    },
    // Дополнительная информация
    description: {
      type: String,
      maxlength: 500
    },
    usageDate: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Индексы для оптимизации запросов
incomeUsageSchema.index({ userId: 1, incomeId: 1 });
incomeUsageSchema.index({ userId: 1, usageDate: -1 });
incomeUsageSchema.index({ depositTransactionId: 1 });

// Виртуальное поле для получения оставшейся суммы
// (будет вычисляться на уровне контроллера)

module.exports = mongoose.model('IncomeUsage', incomeUsageSchema);