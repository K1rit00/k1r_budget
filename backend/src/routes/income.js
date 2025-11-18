const express = require('express');
const router = express.Router();
const {
  getIncomes,
  getIncome,
  createIncome,
  updateIncome,
  deleteIncome,
  getIncomesStats,
  getIncomeUsageHistory // <--- 1. Добавьте импорт
} = require('../controllers/incomeController');
const { protect } = require('../middleware/auth');
const { validateIncome } = require('../middleware/validation');

router.use(protect);

router.route('/')
  .get(getIncomes)
  .post(validateIncome, createIncome);

router.get('/stats', getIncomesStats);

// <--- 2. Вставьте этот роут СЮДА (до /:id)
router.get('/usage/history', getIncomeUsageHistory);

router.route('/:id')
  .get(getIncome)
  .put(validateIncome, updateIncome)
  .delete(deleteIncome);

module.exports = router;