/**
 * Миграция регулярных доходов в отдельную таблицу
 * Запуск: node scripts/migrateToRecurringIncomes.js
 */

require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development' 
});

const mongoose = require('mongoose');

// Старая схема Income
const OldIncomeSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  source: String,
  amount: String,
  description: String,
  date: Date,
  type: String,
  isRecurring: Boolean,
  recurringDay: Number
}, { 
  timestamps: true,
  collection: 'incomes'
});

const OldIncome = mongoose.model('OldIncome', OldIncomeSchema);

// Новая схема RecurringIncome
const RecurringIncomeSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  source: String,
  amount: String,
  description: String,
  type: String,
  recurringDay: Number,
  isActive: { type: Boolean, default: true },
  autoCreate: { type: Boolean, default: true },
  startDate: Date,
  lastCreated: {
    month: Number,
    year: Number
  },
  createdIncomes: Array
}, { 
  timestamps: true,
  collection: 'recurringincomes'
});

const RecurringIncome = mongoose.model('RecurringIncome', RecurringIncomeSchema);

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Находим все доходы с isRecurring: true
    const recurringIncomes = await OldIncome.find({ isRecurring: true }).lean();
    console.log(`Found ${recurringIncomes.length} recurring incomes to migrate`);

    let migrated = 0;
    let deleted = 0;

    for (const income of recurringIncomes) {
      try {
        // Создаём новый шаблон в RecurringIncome
        const recurringTemplate = await RecurringIncome.create({
          userId: income.userId,
          source: income.source,
          amount: income.amount, // Уже зашифрован
          description: income.description,
          type: income.type,
          recurringDay: income.recurringDay || 1,
          isActive: true,
          autoCreate: true,
          startDate: income.date || new Date(),
          createdIncomes: []
        });

        console.log(`✓ Migrated template: ${income.source} (day: ${income.recurringDay})`);
        migrated++;

        // Удаляем старую запись из Income
        await OldIncome.deleteOne({ _id: income._id });
        deleted++;
        
      } catch (error) {
        console.error(`Error migrating income ${income._id}:`, error.message);
      }
    }

    // Обновляем обычные доходы - убираем поля isRecurring и recurringDay
    const updateResult = await OldIncome.updateMany(
      { isRecurring: { $exists: true } },
      { 
        $unset: { 
          isRecurring: "",
          recurringDay: "" 
        } 
      }
    );

    console.log('\n=== Migration Summary ===');
    console.log(`Recurring templates created: ${migrated}`);
    console.log(`Old recurring incomes deleted: ${deleted}`);
    console.log(`Regular incomes cleaned up: ${updateResult.modifiedCount}`);
    console.log('========================\n');

    await mongoose.disconnect();
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();