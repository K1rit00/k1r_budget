const express = require('express');
const router = express.Router();
const {
  getBanks,
  getBank,
  createBank,
  updateBank,
  deleteBank
} = require('../controllers/bankController');
const { protect } = require('../middleware/auth');
const { validateBank } = require('../middleware/validator');

router.use(protect);

router.route('/')
  .get(getBanks)
  .post(validateBank, createBank);

router.route('/:id')
  .get(getBank)
  .put(validateBank, updateBank)
  .delete(deleteBank);

module.exports = router;