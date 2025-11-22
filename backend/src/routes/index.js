const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const incomeRoutes = require('./income');
const recurringIncomeRoutes = require('./recurringIncome');
const categoryRoutes = require('./categories');
const depositRoutes = require('./deposits');
const rentRoutes = require('./rent');
const banksRoutes = require('./banks');
const utilityTypesRoutes = require('./utilityTypes');
const creditRoutes = require('./credit');
const monthlyExpenseRoutes = require('./monthlyExpenses');
const reminders = require('./reminders');

// Credit routes
router.use('/credits', creditRoutes);

// Mount routes
router.use('/auth', authRoutes);
router.use('/income', incomeRoutes);
router.use('/recurring-income', recurringIncomeRoutes);
router.use('/categories', categoryRoutes);
router.use('/rent', rentRoutes);
router.use('/deposits', depositRoutes);
router.use('/banks', banksRoutes);
router.use('/utilitytypes', utilityTypesRoutes);
router.use('/monthly-expenses', monthlyExpenseRoutes);
router.use('/reminders', reminders);

// API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'K1r Budget API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      income: '/income',
      recurringIncome: '/recurring-income',
      categories: '/categories',
      rent: '/rent',
      deposits: '/deposits',
      banks: '/banks',
      credits: '/credits',
      utilityTypes: '/utilitytypes',
      monthlyExpenses: '/monthly-expenses',
      reminders: '/reminders'
    }
  });
});

module.exports = router;