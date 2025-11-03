const Income = require('../models/Income');

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
    const income = await Income.findOne({ _id: req.params.id, userId: req.user.id });
    if (!income) return res.status(404).json({ success: false, message: 'Доход не найден' });
    res.status(200).json({ success: true, data: income });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения дохода', error: error.message });
  }
};

exports.createIncome = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    const income = await Income.create(req.body);
    res.status(201).json({ success: true, data: income });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Ошибка создания дохода', error: error.message });
  }
};

exports.updateIncome = async (req, res) => {
  try {
    let income = await Income.findOne({ _id: req.params.id, userId: req.user.id });
    if (!income) return res.status(404).json({ success: false, message: 'Доход не найден' });
    
    income = await Income.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
      { $group: { _id: '$type', total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения статистики', error: error.message });
  }
};