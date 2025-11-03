const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

exports.validateRegistration = [
  body('firstName').trim().notEmpty().withMessage('Имя обязательно'),
  body('lastName').trim().notEmpty().withMessage('Фамилия обязательна'),
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  validate
];

exports.validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен'),
  validate
];

exports.validateExpense = [
  body('category').trim().notEmpty().withMessage('Категория обязательна'),
  body('amount').notEmpty().withMessage('Сумма обязательна')
    .isNumeric().withMessage('Сумма должна быть числом'),
  body('date').optional().isISO8601().withMessage('Некорректная дата'),
  validate
];

exports.validateIncome = [
  body('source').trim().notEmpty().withMessage('Источник дохода обязателен'),
  body('amount').notEmpty().withMessage('Сумма обязательна')
    .isNumeric().withMessage('Сумма должна быть числом'),
  body('date').optional().isISO8601().withMessage('Некорректная дата'),
  validate
];

exports.validateCategory = [
  body('name').trim().notEmpty().withMessage('Название категории обязательно'),
  body('type').isIn(['expense', 'income']).withMessage('Некорректный тип категории'),
  validate
];