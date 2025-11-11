const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const expenseRoutes = require('./expenses');
const incomeRoutes = require('./income');
const recurringIncomeRoutes = require('./recurringIncome');
const categoryRoutes = require('./categories');
const rentRoutes = require('./rent'); // ← Добавьте

// Mount routes
router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);
router.use('/income', incomeRoutes);
router.use('/recurring-income', recurringIncomeRoutes);
router.use('/categories', categoryRoutes);
router.use('/rent', rentRoutes); // ← Добавьте

// API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'K1r Budget API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      expenses: '/expenses',
      income: '/income',
      recurringIncome: '/recurring-income',
      categories: '/categories',
      rent: '/rent' // ← Добавьте в документацию
    }
  });
});

module.exports = router;