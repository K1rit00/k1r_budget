const Income = require('../models/Income');
const Category = require('../models/Category');
const IncomeUsage = require('../models/IncomeUsage'); // <--- 1. Добавьте этот импорт

exports.getIncomes = async (req, res) => {
  try {
    const { startDate, endDate, type, limit = 50, page = 1 } = req.query;
    const query = { userId: req.user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (type) query.type = type;

    const incomes = await Income.find(query)
      .populate('type', 'name icon color') 
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Income.countDocuments(query);

    res.status(200).json({
      success: true,
      count: incomes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: incomes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения доходов', error: error.message });
  }
};

exports.getIncome = async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('type', 'name icon color');
    if (!income) return res.status(404).json({ success: false, message: 'Доход не найден' });
    res.status(200).json({ success: true, data: income });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения дохода', error: error.message });
  }
};

exports.createIncome = async (req, res) => {
  try {
    const category = await Category.findOne({ 
      _id: req.body.type, 
      userId: req.user.id,
      type: 'income' 
    });
    
    if (!category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Категория не найдена или не является категорией дохода' 
      });
    }

    req.body.userId = req.user.id;
    const income = await Income.create(req.body);
    
    const populatedIncome = await Income.findById(income._id)
      .populate('type', 'name icon color');
    
    res.status(201).json({ success: true, data: populatedIncome });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка создания дохода', error: error.message });
  }
};

exports.updateIncome = async (req, res) => {
  try {
    let income = await Income.findOne({ _id: req.params.id, userId: req.user.id });
    if (!income) return res.status(404).json({ success: false, message: 'Доход не найден' });
    
    if (req.body.type) {
      const category = await Category.findOne({ 
        _id: req.body.type, 
        userId: req.user.id,
        type: 'income' 
      });
      
      if (!category) {
        return res.status(400).json({ 
          success: false, 
          message: 'Категория не найдена или не является категорией дохода' 
        });
      }
    }
    
    income = await Income.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    }).populate('type', 'name icon color');
    
    res.status(200).json({ success: true, data: income });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка обновления дохода', error: error.message });
  }
};

exports.deleteIncome = async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, userId: req.user.id });
    if (!income) return res.status(404).json({ success: false, message: 'Доход не найден' });
    
    await income.deleteOne();
    res.status(200).json({ success: true, message: 'Доход удален' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка удаления дохода', error: error.message });
  }
};

exports.getIncomesStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { userId: req.user.id };
    
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const stats = await Income.aggregate([
      { $match: match },
      { 
        $lookup: {
          from: 'categories',
          localField: 'type',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      { 
        $group: { 
          _id: '$type',
          categoryName: { $first: '$category.name' },
          categoryIcon: { $first: '$category.icon' },
          categoryColor: { $first: '$category.color' },
          total: { $sum: { $toDouble: '$amount' } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения статистики', error: error.message });
  }
};

// <--- 2. Добавьте этот метод в конец файла
exports.getIncomeUsageHistory = async (req, res) => {
  try {
    const history = await IncomeUsage.find({ userId: req.user.id })
      .sort({ usageDate: -1 })
      .populate({
        path: 'incomeId',
        select: 'source amount date type' 
      });

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching income usage history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении истории операций',
      error: error.message 
    });
  }
};