const Expense = require('../models/Expense');

// @desc    Get all expenses
// @route   GET /api/v1/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, limit = 50, page = 1 } = req.query;

    const query = { userId: req.user.id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) {
      query.category = category;
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Expense.countDocuments(query);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: expenses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения расходов',
      error: error.message
    });
  }
};

// @desc    Get single expense
// @route   GET /api/v1/expenses/:id
// @access  Private
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Расход не найден'
      });
    }

    res.status(200).json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения расхода',
      error: error.message
    });
  }
};

// @desc    Create expense
// @route   POST /api/v1/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  try {
    req.body.userId = req.user.id;

    const expense = await Expense.create(req.body);

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ошибка создания расхода',
      error: error.message
    });
  }
};

// @desc    Update expense
// @route   PUT /api/v1/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    let expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Расход не найден'
      });
    }

    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Ошибка обновления расхода',
      error: error.message
    });
  }
};

// @desc    Delete expense
// @route   DELETE /api/v1/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Расход не найден'
      });
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Расход удален'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления расхода',
      error: error.message
    });
  }
};

// @desc    Get expenses statistics
// @route   GET /api/v1/expenses/stats
// @access  Private
exports.getExpensesStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const match = { userId: req.user.id };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const stats = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: { $toDouble: '$amount' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики',
      error: error.message
    });
  }
};