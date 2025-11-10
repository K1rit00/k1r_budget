const express = require('express');
const router = express.Router();
const {
  getRecurringIncomes,
  getRecurringIncome,
  createRecurringIncome,
  updateRecurringIncome,
  deleteRecurringIncome,
  toggleRecurringIncome,
  processRecurringIncomes,
  getCreatedIncomesHistory
} = require('../controllers/recurringIncomeController');
const { protect } = require('../middleware/auth');
const { validateRecurringIncome } = require('../middleware/validation'); // ← Используйте validation, не validator

router.use(protect);

router.route('/')
  .get(getRecurringIncomes)
  .post(validateRecurringIncome, createRecurringIncome);

router.post('/process', processRecurringIncomes);

router.route('/:id')
  .get(getRecurringIncome)
  .put(validateRecurringIncome, updateRecurringIncome)
  .delete(deleteRecurringIncome);

router.patch('/:id/toggle', toggleRecurringIncome);
router.get('/:id/history', getCreatedIncomesHistory);

module.exports = router;