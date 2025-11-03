const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { validateCategory } = require('../middleware/validator');

router.use(protect);

router.route('/')
  .get(getCategories)
  .post(validateCategory, createCategory);

router.route('/:id')
  .get(getCategory)
  .put(validateCategory, updateCategory)
  .delete(deleteCategory);

module.exports = router;