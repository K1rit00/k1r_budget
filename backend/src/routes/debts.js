const express = require('express');
const router = express.Router();
const {
  getDebts,
  getDebt,
  createDebt,
  updateDebt,
  deleteDebt,
  addPayment,
  getPayments,
  deletePayment,
  getStatistics
} = require('../controllers/debtController');

const { protect } = require('../middleware/auth');

// Защищаем все роуты
router.use(protect);

// Статистика (должна быть перед /:id)
router.get('/statistics', getStatistics);

// Основные CRUD операции
router.route('/')
  .get(getDebts)
  .post(createDebt);

router.route('/:id')
  .get(getDebt)
  .put(updateDebt)
  .delete(deleteDebt);

// Операции с платежами
router.route('/:id/payments')
  .get(getPayments)
  .post(addPayment);

router.delete('/:id/payments/:paymentId', deletePayment);

module.exports = router;