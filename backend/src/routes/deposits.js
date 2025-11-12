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

// Deposit routes
router.route('/')
  .get(getDeposits)
  .post(validateDeposit, createDeposit);

router.route('/statistics')
  .get(getStatistics);

router.route('/:id')
  .get(getDeposit)
  .put(validateDeposit, updateDeposit)
  .delete(deleteDeposit);

router.route('/:id/close')
  .patch(closeDeposit);

router.route('/:id/renew')
  .patch(renewDeposit);

// Transaction routes
router.route('/transactions')
  .get(getTransactions)
  .post(createTransaction);

router.route('/transactions/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;