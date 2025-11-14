const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

exports.validateRegistration = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Имя обязательно')
    .isLength({ max: 50 }).withMessage('Имя не может быть длиннее 50 символов'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Фамилия обязательна')
    .isLength({ max: 50 }).withMessage('Фамилия не может быть длиннее 50 символов'),
  body('login')
    .trim()
    .notEmpty().withMessage('Логин обязателен')
    .isLength({ min: 3, max: 30 }).withMessage('Логин должен содержать от 3 до 30 символов')
    .matches(/^[a-z0-9_-]+$/i).withMessage('Логин может содержать только буквы, цифры, _ и -')
    .toLowerCase(),
  body('password')
    .isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  validate
];

exports.validateLogin = [
  body('login')
    .trim()
    .notEmpty().withMessage('Логин обязателен')
    .toLowerCase(),
  body('password')
    .notEmpty().withMessage('Пароль обязателен'),
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

// Bank validation
exports.validateBank = [
  body('name')
    .trim()
    .notEmpty().withMessage('Название банка обязательно')
    .isLength({ max: 200 }).withMessage('Название не может быть длиннее 200 символов'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Описание не может быть длиннее 500 символов'),
  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault должен быть булевым значением'),
  validate
];

// Currency validation
exports.validateCurrency = [
  body('code')
    .trim()
    .notEmpty().withMessage('Код валюты обязателен')
    .isLength({ max: 10 }).withMessage('Код не может быть длиннее 10 символов')
    .toUpperCase(),
  body('name')
    .trim()
    .notEmpty().withMessage('Название валюты обязательно')
    .isLength({ max: 100 }).withMessage('Название не может быть длиннее 100 символов'),
  body('symbol')
    .trim()
    .notEmpty().withMessage('Символ валюты обязателен')
    .isLength({ max: 10 }).withMessage('Символ не может быть длиннее 10 символов'),
  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault должен быть булевым значением'),
  body('exchangeRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Курс обмена не может быть отрицательным'),
  validate
];

// Utility Type validation
exports.validateUtilityType = [
  body('name')
    .trim()
    .notEmpty().withMessage('Название типа услуги обязательно')
    .isLength({ max: 100 }).withMessage('Название не может быть длиннее 100 символов'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Описание не может быть длиннее 500 символов'),
  body('icon')
    .optional()
    .trim(),
  body('color')
    .optional()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Цвет должен быть в формате HEX (#RRGGBB)'),
  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault должен быть булевым значением'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Порядок должен быть неотрицательным числом'),
  validate
];