/**
 * Middleware для валидации данных
 */

// Валидация Income (обычные доходы)
exports.validateIncome = (req, res, next) => {
  const { source, amount, date, type } = req.body;
  const errors = [];

  // Проверка источника
  if (!source || source.trim() === '') {
    errors.push('Источник дохода обязателен');
  } else if (source.length > 200) {
    errors.push('Источник дохода не может быть длиннее 200 символов');
  }

  // Проверка суммы
  if (!amount) {
    errors.push('Сумма обязательна');
  } else {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Сумма должна быть положительным числом');
    }
    if (amountNum > 999999999999) {
      errors.push('Сумма слишком большая');
    }
  }

  // Проверка даты
  if (!date) {
    errors.push('Дата обязательна');
  } else {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push('Некорректная дата');
    }
  }

  // Проверка типа
  const validTypes = ['salary', 'bonus', 'investment', 'freelance', 'other'];
  if (type && !validTypes.includes(type)) {
    errors.push('Недопустимый тип дохода');
  }

  // Проверка описания (если есть)
  if (req.body.description && req.body.description.length > 500) {
    errors.push('Описание не может быть длиннее 500 символов');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация RecurringIncome (регулярные доходы)
exports.validateRecurringIncome = (req, res, next) => {
  const { source, amount, type, recurringDay } = req.body;
  const errors = [];

  // Проверка источника
  if (!source || source.trim() === '') {
    errors.push('Источник дохода обязателен');
  } else if (source.length > 200) {
    errors.push('Источник дохода не может быть длиннее 200 символов');
  }

  // Проверка суммы
  if (!amount) {
    errors.push('Сумма обязательна');
  } else {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Сумма должна быть положительным числом');
    }
    if (amountNum > 999999999999) {
      errors.push('Сумма слишком большая');
    }
  }

  // Проверка типа
  const validTypes = ['salary', 'bonus', 'investment', 'freelance', 'other'];
  if (type && !validTypes.includes(type)) {
    errors.push('Недопустимый тип дохода');
  }

  // Проверка дня месяца (обязательно для регулярных доходов)
  if (!recurringDay) {
    errors.push('День месяца обязателен для регулярного дохода');
  } else {
    const day = parseInt(recurringDay);
    if (isNaN(day) || day < 1 || day > 31) {
      errors.push('День месяца должен быть от 1 до 31');
    }
  }

  // Проверка описания (если есть)
  if (req.body.description && req.body.description.length > 500) {
    errors.push('Описание не может быть длиннее 500 символов');
  }

  // Проверка дат начала/окончания (если есть)
  if (req.body.startDate) {
    const startDate = new Date(req.body.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Некорректная дата начала');
    }
  }

  if (req.body.endDate) {
    const endDate = new Date(req.body.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push('Некорректная дата окончания');
    }
    
    // Проверка, что дата окончания после начала
    if (req.body.startDate) {
      const startDate = new Date(req.body.startDate);
      if (endDate <= startDate) {
        errors.push('Дата окончания должна быть после даты начала');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация Expense (расходы)
exports.validateExpense = (req, res, next) => {
  const { title, amount, date, category } = req.body;
  const errors = [];

  // Проверка названия
  if (!title || title.trim() === '') {
    errors.push('Название расхода обязательно');
  } else if (title.length > 200) {
    errors.push('Название не может быть длиннее 200 символов');
  }

  // Проверка суммы
  if (!amount) {
    errors.push('Сумма обязательна');
  } else {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Сумма должна быть положительным числом');
    }
    if (amountNum > 999999999999) {
      errors.push('Сумма слишком большая');
    }
  }

  // Проверка даты
  if (!date) {
    errors.push('Дата обязательна');
  } else {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push('Некорректная дата');
    }
  }

  // Проверка категории
  if (!category || category.trim() === '') {
    errors.push('Категория обязательна');
  }

  // Проверка описания (если есть)
  if (req.body.description && req.body.description.length > 500) {
    errors.push('Описание не может быть длиннее 500 символов');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация Category (категории)
exports.validateCategory = (req, res, next) => {
  const { name, type } = req.body;
  const errors = [];

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название категории обязательно');
  } else if (name.length > 100) {
    errors.push('Название не может быть длиннее 100 символов');
  }

  // Проверка типа
  const validTypes = ['expense', 'income'];
  if (!type) {
    errors.push('Тип категории обязателен');
  } else if (!validTypes.includes(type)) {
    errors.push('Недопустимый тип категории');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация Credit (кредиты)
exports.validateCredit = (req, res, next) => {
  const { name, totalAmount, monthlyPayment, interestRate, startDate, endDate } = req.body;
  const errors = [];

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название кредита обязательно');
  } else if (name.length > 200) {
    errors.push('Название не может быть длиннее 200 символов');
  }

  // Проверка общей суммы
  if (!totalAmount) {
    errors.push('Общая сумма обязательна');
  } else {
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Общая сумма должна быть положительным числом');
    }
  }

  // Проверка ежемесячного платежа
  if (!monthlyPayment) {
    errors.push('Ежемесячный платеж обязателен');
  } else {
    const payment = parseFloat(monthlyPayment);
    if (isNaN(payment) || payment <= 0) {
      errors.push('Ежемесячный платеж должен быть положительным числом');
    }
  }

  // Проверка процентной ставки
  if (interestRate !== undefined && interestRate !== null) {
    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errors.push('Процентная ставка должна быть от 0 до 100');
    }
  }

  // Проверка дат
  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push('Некорректная дата начала');
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push('Некорректная дата окончания');
    }

    if (startDate) {
      const start = new Date(startDate);
      if (end <= start) {
        errors.push('Дата окончания должна быть после даты начала');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация Deposit (депозиты)
exports.validateDeposit = (req, res, next) => {
  const { name, amount, interestRate, startDate, endDate } = req.body;
  const errors = [];

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название депозита обязательно');
  } else if (name.length > 200) {
    errors.push('Название не может быть длиннее 200 символов');
  }

  // Проверка суммы
  if (!amount) {
    errors.push('Сумма обязательна');
  } else {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Сумма должна быть положительным числом');
    }
  }

  // Проверка процентной ставки
  if (!interestRate) {
    errors.push('Процентная ставка обязательна');
  } else {
    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errors.push('Процентная ставка должна быть от 0 до 100');
    }
  }

  // Проверка дат
  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push('Некорректная дата начала');
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push('Некорректная дата окончания');
    }

    if (startDate) {
      const start = new Date(startDate);
      if (end <= start) {
        errors.push('Дата окончания должна быть после даты начала');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация MonthlyExpense (ежемесячные расходы)
exports.validateMonthlyExpense = (req, res, next) => {
  const { name, amount, category } = req.body;
  const errors = [];

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название расхода обязательно');
  } else if (name.length > 200) {
    errors.push('Название не может быть длиннее 200 символов');
  }

  // Проверка суммы
  if (!amount) {
    errors.push('Сумма обязательна');
  } else {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Сумма должна быть положительным числом');
    }
  }

  // Проверка категории
  if (!category || category.trim() === '') {
    errors.push('Категория обязательна');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация Rent (аренда)
exports.validateRent = (req, res, next) => {
  const { address, monthlyRent } = req.body;
  const errors = [];

  // Проверка адреса
  if (!address || address.trim() === '') {
    errors.push('Адрес обязателен');
  } else if (address.length > 300) {
    errors.push('Адрес не может быть длиннее 300 символов');
  }

  // Проверка ежемесячной аренды
  if (!monthlyRent) {
    errors.push('Ежемесячная аренда обязательна');
  } else {
    const rent = parseFloat(monthlyRent);
    if (isNaN(rent) || rent <= 0) {
      errors.push('Ежемесячная аренда должна быть положительным числом');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация Utility (коммунальные услуги)
exports.validateUtility = (req, res, next) => {
  const { name, amount, dueDate } = req.body;
  const errors = [];

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название услуги обязательно');
  } else if (name.length > 200) {
    errors.push('Название не может быть длиннее 200 символов');
  }

  // Проверка суммы
  if (!amount) {
    errors.push('Сумма обязательна');
  } else {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Сумма должна быть положительным числом');
    }
  }

  // Проверка даты оплаты
  if (dueDate) {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      errors.push('Некорректная дата оплаты');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация регистрации пользователя
exports.validateRegister = (req, res, next) => {
  const { firstName, lastName, login, password } = req.body;
  const errors = [];

  // Проверка имени
  if (!firstName || firstName.trim() === '') {
    errors.push('Имя обязательно');
  } else if (firstName.length < 2 || firstName.length > 50) {
    errors.push('Имя должно быть от 2 до 50 символов');
  }

  // Проверка фамилии
  if (!lastName || lastName.trim() === '') {
    errors.push('Фамилия обязательна');
  } else if (lastName.length < 2 || lastName.length > 50) {
    errors.push('Фамилия должна быть от 2 до 50 символов');
  }

  // Проверка логина
  if (!login || login.trim() === '') {
    errors.push('Логин обязателен');
  } else if (login.length < 3 || login.length > 50) {
    errors.push('Логин должен быть от 3 до 50 символов');
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(login)) {
    errors.push('Логин может содержать только буквы, цифры, точки, дефисы и подчеркивания');
  }

  // Проверка пароля
  if (!password || password.trim() === '') {
    errors.push('Пароль обязателен');
  } else if (password.length < 6) {
    errors.push('Пароль должен быть минимум 6 символов');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация логина пользователя
exports.validateLogin = (req, res, next) => {
  const { login, password } = req.body;
  const errors = [];

  // Проверка логина
  if (!login || login.trim() === '') {
    errors.push('Логин обязателен');
  }

  // Проверка пароля
  if (!password || password.trim() === '') {
    errors.push('Пароль обязателен');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};