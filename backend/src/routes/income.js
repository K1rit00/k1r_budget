const express = require('express');
const router = express.Router();
const {
  getIncomes,
  getIncome,
  createIncome,
  updateIncome,
  deleteIncome,
  getIncomesStats
} = require('../controllers/incomeController');
const { protect } = require('../middleware/auth');
const { validateIncome } = require('../middleware/validation');

router.use(protect);

router.route('/')
  .get(getIncomes)
  .post(validateIncome, createIncome);

router.get('/stats', getIncomesStats);

router.route('/:id')
  .get(getIncome)
  .put(validateIncome, updateIncome)
  .delete(deleteIncome);

module.exports = router;