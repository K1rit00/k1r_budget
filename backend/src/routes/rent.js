const express = require('express');
const router = express.Router();
const {
  getRentProperties,
  getRentProperty,
  createRentProperty,
  updateRentProperty,
  deleteRentProperty,
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getStatistics
} = require('../controllers/rentController');
const { protect } = require('../middleware/auth');
const { validateRentProperty, validateRentPayment } = require('../middleware/validation');

// Все роуты защищены аутентификацией
router.use(protect);

// Statistics route (должен быть перед другими роутами чтобы не конфликтовать с /:id)
router.get('/statistics', getStatistics);

// Payment routes (должны быть перед property routes)
router.route('/payments')
  .get(getPayments)
  .post(validateRentPayment, createPayment);

router.route('/payments/:id')
  .get(getPayment)
  .put(validateRentPayment, updatePayment)
  .delete(deletePayment);

// Property routes
router.route('/')
  .get(getRentProperties)
  .post(validateRentProperty, createRentProperty);

router.route('/:id')
  .get(getRentProperty)
  .put(validateRentProperty, updateRentProperty)
  .delete(deleteRentProperty);

module.exports = router;