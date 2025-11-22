// server/controllers/reminderController.js
const PaymentReminder = require('../models/PaymentReminder'); // Убедитесь, что модель создана (см. предыдущий шаг)
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all reminders
// @route   GET /api/v1/reminders
// @access  Private
exports.getReminders = asyncHandler(async (req, res) => {
  const reminders = await PaymentReminder.find({ user: req.user.id }).sort({ date: 1 });

  res.status(200).json({
    success: true,
    count: reminders.length,
    data: reminders
  });
});

// @desc    Create reminder
// @route   POST /api/v1/reminders
// @access  Private
exports.createReminder = asyncHandler(async (req, res) => {
  try {
    req.body.user = req.user.id;

    if (req.body.isRecurring && !req.body.dayOfMonth) {
      const date = new Date(req.body.date);
      req.body.dayOfMonth = date.getDate();
    }

    const reminder = await PaymentReminder.create(req.body);

    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error("Error creating reminder:", error); // Увидите точную ошибку валидации
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Delete reminder
// @route   DELETE /api/v1/reminders/:id
// @access  Private
exports.deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await PaymentReminder.findOne({
    _id: req.params.id,
    user: req.user.id
  });

  if (!reminder) {
    return res.status(404).json({
      success: false,
      message: 'Напоминание не найдено'
    });
  }

  await reminder.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});