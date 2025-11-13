const express = require('express');
const router = express.Router();
const {
  getCurrencies,
  getCurrency,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  setDefaultCurrency
} = require('../controllers/currencyController');
const { protect } = require('../middleware/auth');
const { validateCurrency } = require('../middleware/validator');

router.use(protect);

router.route('/')
  .get(getCurrencies)
  .post(validateCurrency, createCurrency);

router.route('/:id')
  .get(getCurrency)
  .put(validateCurrency, updateCurrency)
  .delete(deleteCurrency);

router.route('/:id/set-default')
  .patch(setDefaultCurrency);

module.exports = router;