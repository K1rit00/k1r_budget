const express = require('express');
const router = express.Router();
const {
  getMonthlyExpenses,
  getMonthlyExpense,
  createMonthlyExpense,
  updateMonthlyExpense,
  deleteMonthlyExpense,
  getMonthlyStats,
  getOverdueExpenses,
  updateOverdueStatus,
  transferRecurringExpenses,
  getExpenseTransactionsHistory
} = require('../controllers/monthlyExpenseController');
const { protect } = require('../middleware/auth');
const { validateMonthlyExpense } = require('../middleware/validation');

router.use(protect);

// Сначала специфические маршруты
router.post('/transfer', transferRecurringExpenses); // Новый маршрут
router.get('/stats/by-month', getMonthlyStats);
router.get('/overdue', getOverdueExpenses);
router.post('/update-overdue', updateOverdueStatus);
router.get('/transactions/history', getExpenseTransactionsHistory);

router.route('/')
  .get(getMonthlyExpenses)
  .post(validateMonthlyExpense, createMonthlyExpense);

router.route('/:id')
  .get(getMonthlyExpense)
  .put(validateMonthlyExpense, updateMonthlyExpense)
  .delete(deleteMonthlyExpense);

module.exports = router;