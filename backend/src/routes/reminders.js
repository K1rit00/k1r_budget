// server/routes/reminders.js
const express = require('express');
const {
  getReminders,
  createReminder,
  deleteReminder
} = require('../controllers/reminderController');

const router = express.Router();

// Middleware защиты (проверка токена), такой же как используется в других роутах
const { protect } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getReminders)
  .post(createReminder);

router
  .route('/:id')
  .delete(deleteReminder);

module.exports = router;