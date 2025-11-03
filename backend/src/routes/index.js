const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const expenseRoutes = require('./expenses');
const incomeRoutes = require('./income');
const categoryRoutes = require('./categories');

// Mount routes
router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);
router.use('/income', incomeRoutes);
router.use('/categories', categoryRoutes);

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
      categories: '/categories'
    }
  });
});

module.exports = router;