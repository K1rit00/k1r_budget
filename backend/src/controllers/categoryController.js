const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { userId: req.user.id };
    if (type) query.type = type;

    const categories = await Category.find(query).sort({ order: 1, name: 1 });
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения категорий', error: error.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения категории', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка создания категории', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    let category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
    
    category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка обновления категории', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!category) return res.status(404).json({ success: false, message: 'Категория не найдена' });
    if (category.isDefault) return res.status(400).json({ success: false, message: 'Нельзя удалить категорию по умолчанию' });
    
    await category.deleteOne();
    res.status(200).json({ success: true, message: 'Категория удалена' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка удаления категории', error: error.message });
  }
};