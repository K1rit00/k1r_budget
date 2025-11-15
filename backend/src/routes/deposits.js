const express = require('express');
const router = express.Router();
const {
  getDeposits,
  getDeposit,
  createDeposit,
  updateDeposit,
  deleteDeposit,
  closeDeposit,
  renewDeposit,
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getStatistics,
  getAvailableIncomes  // НОВЫЙ МЕТОД
} = require('../controllers/depositController');

const { protect } = require('../middleware/auth');
const { validateDeposit } = require('../middleware/validation');

// Все роуты требуют авторизации
router.use(protect);

// ========================================
// ВАЖНО: Специфичные маршруты должны быть ПЕРЕД параметризованными!
// Порядок имеет критическое значение в Express.js
// ========================================

// 1. Statistics route (самый специфичный)
router.route('/statistics')
  .get(getStatistics);

// 2. Available incomes route (НОВЫЙ ENDPOINT)
router.route('/available-incomes')
  .get(getAvailableIncomes);

// 3. Transaction routes (специфичные)
router.route('/transactions')
  .get(getTransactions)
  .post(createTransaction);

router.route('/transactions/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

// 4. Deposit action routes (специфичные операции)
router.route('/:id/close')
  .patch(closeDeposit);

router.route('/:id/renew')
  .patch(renewDeposit);

// 5. Base deposit routes
router.route('/')
  .get(getDeposits)
  .post(validateDeposit, createDeposit);

// 6. Параметризованный маршрут ДОЛЖЕН быть в конце!
router.route('/:id')
  .get(getDeposit)
  .put(validateDeposit, updateDeposit)
  .delete(deleteDeposit);

module.exports = router;