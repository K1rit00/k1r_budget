const express = require('express');
const router = express.Router();
const {
  getUtilityTypes,
  getUtilityType,
  createUtilityType,
  updateUtilityType,
  deleteUtilityType
} = require('../controllers/utilityTypeController');
const { protect } = require('../middleware/auth');
const { validateUtilityType } = require('../middleware/validator');

router.use(protect);

router.route('/')
  .get(getUtilityTypes)
  .post(validateUtilityType, createUtilityType);

router.route('/:id')
  .get(getUtilityType)
  .put(validateUtilityType, updateUtilityType)
  .delete(deleteUtilityType);

module.exports = router;