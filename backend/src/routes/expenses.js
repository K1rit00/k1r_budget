const express = require('express');
const router = express.Router();
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesStats
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { validateExpense } = require('../middleware/validator');

router.use(protect);

router.route('/')
  .get(getExpenses)
  .post(validateExpense, createExpense);

router.get('/stats', getExpensesStats);

router.route('/:id')
  .get(getExpense)
  .put(validateExpense, updateExpense)
  .delete(deleteExpense);

module.exports = router;