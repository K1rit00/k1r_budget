/**
 * Миграция для шифрования существующих данных Income
 * Запуск: node scripts/migrateIncomeData.js
 */

require('dotenv').config({ 
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development' 
});

const mongoose = require('mongoose');
const encryptionService = require('../src/services/encryptionService');

// Простая схема без хуков для прямого доступа к данным
const IncomeRawSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  source: String,
  amount: String,
  description: String,
  date: Date,
  type: String,
  isRecurring: Boolean,
  recurringDay: Number,
  _encrypted: Boolean
}, { 
  timestamps: true,
  collection: 'incomes' // Явно указываем имя коллекции
});

const IncomeRaw = mongoose.model('IncomeRaw', IncomeRawSchema);

// Проверка, зашифрованы ли данные
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(value) && value.length > 100;
}

// Проверка, является ли строка числом
function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

async function migrateIncomes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Получаем все записи напрямую, без хуков
    const incomes = await IncomeRaw.find({}).lean();
    console.log(`Found ${incomes.length} income records`);

    let encrypted = 0;
    let alreadyEncrypted = 0;
    let errors = 0;
    let deleted = 0;

    for (const income of incomes) {
      try {
        if (!income.amount) {
          console.log(`⚠️  Income ${income._id} has no amount, deleting...`);
          await IncomeRaw.deleteOne({ _id: income._id });
          deleted++;
          continue;
        }

        // Проверяем, зашифрованы ли данные
        if (isEncrypted(income.amount)) {
          // Пробуем расшифровать для проверки
          try {
            const decrypted = encryptionService.decrypt(income.amount);
            console.log(`✓ Income ${income._id} already encrypted (amount: ${decrypted})`);
            alreadyEncrypted++;
          } catch (decryptError) {
            console.log(`❌ Income ${income._id} has corrupted encryption, re-encrypting...`);
            
            // Если не можем расшифровать, удаляем или пытаемся восстановить
            // В данном случае удаляем, так как данные повреждены
            await IncomeRaw.deleteOne({ _id: income._id });
            deleted++;
            console.log(`   Deleted corrupted record ${income._id}`);
          }
        } else {
          // Данные не зашифрованы, шифруем
          if (isNumeric(income.amount)) {
            const encryptedAmount = encryptionService.encrypt(income.amount.toString());
            await IncomeRaw.updateOne(
              { _id: income._id },
              { 
                $set: { 
                  amount: encryptedAmount,
                  _encrypted: true 
                } 
              }
            );
            console.log(`🔒 Encrypted income ${income._id} (amount: ${income.amount})`);
            encrypted++;
          } else {
            console.log(`⚠️  Income ${income._id} has invalid amount: "${income.amount}", deleting...`);
            await IncomeRaw.deleteOne({ _id: income._id });
            deleted++;
          }
        }
      } catch (error) {
        console.error(`Error processing income ${income._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total records: ${incomes.length}`);
    console.log(`Already encrypted: ${alreadyEncrypted}`);
    console.log(`Newly encrypted: ${encrypted}`);
    console.log(`Deleted (corrupted/invalid): ${deleted}`);
    console.log(`Errors: ${errors}`);
    console.log('========================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Запуск миграции
migrateIncomes();