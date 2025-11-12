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
  getStatistics
} = require('../controllers/depositController');

const { protect } = require('../middleware/auth');
const { validateDeposit } = require('../middleware/validation');

// Все роуты требуют авторизации
router.use(protect);

// ВАЖНО: Специфичные маршруты должны быть ПЕРЕД параметризованными!

// Statistics route (должен быть перед /:id)
router.route('/statistics')
  .get(getStatistics);

// Transaction routes (должны быть перед /:id)
router.route('/transactions')
  .get(getTransactions)
  .post(createTransaction);

router.route('/transactions/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

// Deposit routes (параметризованные маршруты в конце)
router.route('/')
  .get(getDeposits)
  .post(validateDeposit, createDeposit);

router.route('/:id')
  .get(getDeposit)
  .put(validateDeposit, updateDeposit)
  .delete(deleteDeposit);

router.route('/:id/close')
  .patch(closeDeposit);

router.route('/:id/renew')
  .patch(renewDeposit);

module.exports = router;