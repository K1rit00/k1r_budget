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
  // Логирование для отладки
  console.log('Deposit validation - received body:', JSON.stringify(req.body, null, 2));

  const { bankName, accountNumber, amount, interestRate, startDate, endDate, type } = req.body;
  const errors = [];

  // Проверка названия банка
  if (!bankName || bankName.trim() === '') {
    errors.push('Название банка обязательно');
  } else if (bankName.length > 200) {
    errors.push('Название банка не может быть длиннее 200 символов');
  }

  // Проверка номера счета
  if (!accountNumber || accountNumber.trim() === '') {
    errors.push('Номер счета обязателен');
  } else if (accountNumber.length > 100) {
    errors.push('Номер счета не может быть длиннее 100 символов');
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

  // Проверка процентной ставки
  if (interestRate === undefined || interestRate === null || interestRate === '') {
    errors.push('Процентная ставка обязательна');
  } else {
    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errors.push('Процентная ставка должна быть от 0 до 100');
    }
  }

  // Проверка типа депозита - ИСПРАВЛЕНО: добавлен 'spending'
  const validTypes = ['fixed', 'savings', 'investment', 'spending'];
  if (!type) {
    errors.push('Тип депозита обязателен');
  } else if (!validTypes.includes(type)) {
    errors.push('Недопустимый тип депозита');
  }

  // Проверка даты начала
  if (!startDate) {
    errors.push('Дата открытия обязательна');
  } else {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push('Некорректная дата начала');
    }
  }

  // Проверка даты окончания
  if (!endDate) {
    errors.push('Дата закрытия обязательна');
  } else {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push('Некорректная дата окончания');
    }

    // КРИТИЧЕСКИ ВАЖНО: проверяем даты корректно
    if (startDate) {
      const start = new Date(startDate);
      const endParsed = new Date(endDate);

      // Приводим даты к началу дня для корректного сравнения
      start.setHours(0, 0, 0, 0);
      endParsed.setHours(0, 0, 0, 0);

      if (endParsed <= start) {
        errors.push('Дата закрытия должна быть после даты открытия');
      }
    }
  }

  // Проверка статуса (если указан)
  const validStatuses = ['active', 'matured', 'closed'];
  if (req.body.status && !validStatuses.includes(req.body.status)) {
    errors.push('Недопустимый статус депозита');
  }

  // Проверка описания (если есть)
  if (req.body.description && req.body.description.length > 500) {
    errors.push('Описание не может быть длиннее 500 символов');
  }

  // Проверка currentBalance (если указан)
  if (req.body.currentBalance !== undefined && req.body.currentBalance !== null) {
    const balance = parseFloat(req.body.currentBalance);
    if (isNaN(balance) || balance < 0) {
      errors.push('Текущий баланс не может быть отрицательным');
    }
  }

  if (errors.length > 0) {
    console.log('Validation errors:', errors);
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors
    });
  }

  next();
};

// Валидация банка
exports.validateBank = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название банка обязательно');
  } else if (name.length > 200) {
    errors.push('Название банка не может быть длиннее 200 символов');
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

// Валидация валюты
exports.validateCurrency = (req, res, next) => {
  const { code, name, symbol } = req.body;
  const errors = [];

  // Проверка кода валюты
  if (!code || code.trim() === '') {
    errors.push('Код валюты обязателен');
  } else if (code.length > 10) {
    errors.push('Код валюты не может быть длиннее 10 символов');
  } else if (!/^[A-Z]+$/.test(code.toUpperCase())) {
    errors.push('Код валюты должен содержать только заглавные буквы');
  }

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название валюты обязательно');
  } else if (name.length > 100) {
    errors.push('Название валюты не может быть длиннее 100 символов');
  }

  // Проверка символа
  if (!symbol || symbol.trim() === '') {
    errors.push('Символ валюты обязателен');
  } else if (symbol.length > 10) {
    errors.push('Символ валюты не может быть длиннее 10 символов');
  }

  // Проверка курса обмена (если указан)
  if (req.body.exchangeRate !== undefined && req.body.exchangeRate !== null) {
    const rate = parseFloat(req.body.exchangeRate);
    if (isNaN(rate) || rate < 0) {
      errors.push('Курс обмена должен быть положительным числом');
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

// Валидация типа коммунальной услуги
exports.validateUtilityType = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  // Проверка названия
  if (!name || name.trim() === '') {
    errors.push('Название типа услуги обязательно');
  } else if (name.length > 100) {
    errors.push('Название не может быть длиннее 100 символов');
  }

  // Проверка описания (если есть)
  if (req.body.description && req.body.description.length > 500) {
    errors.push('Описание не может быть длиннее 500 символов');
  }

  // Проверка иконки (если есть)
  if (req.body.icon && req.body.icon.length > 50) {
    errors.push('Название иконки не может быть длиннее 50 символов');
  }

  // Проверка цвета (если есть)
  if (req.body.color && !/^#[0-9A-Fa-f]{6}$/.test(req.body.color)) {
    errors.push('Цвет должен быть в формате HEX (#RRGGBB)');
  }

  // Проверка порядка (если есть)
  if (req.body.order !== undefined && req.body.order !== null) {
    const order = parseInt(req.body.order);
    if (isNaN(order)) {
      errors.push('Порядок должен быть числом');
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

// Валидация объекта недвижимости (Property)
exports.validateRentProperty = (req, res, next) => {
  const { address, ownerName, rentAmount, deposit, startDate, endDate, utilitiesType } = req.body;
  const errors = [];

  // Проверка адреса
  if (!address || address.trim() === '') {
    errors.push('Адрес обязателен');
  } else if (address.length < 5 || address.length > 200) {
    errors.push('Адрес должен быть от 5 до 200 символов');
  }

  // Проверка имени владельца
  if (!ownerName || ownerName.trim() === '') {
    errors.push('Имя владельца обязательно');
  } else if (ownerName.length < 2 || ownerName.length > 100) {
    errors.push('Имя владельца должно быть от 2 до 100 символов');
  }

  // Проверка арендной платы
  if (!rentAmount) {
    errors.push('Арендная плата обязательна');
  } else {
    const amount = parseFloat(rentAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Арендная плата должна быть положительным числом');
    }
    if (amount > 999999999) {
      errors.push('Арендная плата слишком большая');
    }
  }

  // Проверка залога
  if (!deposit && deposit !== 0) {
    errors.push('Залог обязателен');
  } else {
    const depositAmount = parseFloat(deposit);
    if (isNaN(depositAmount) || depositAmount < 0) {
      errors.push('Залог должен быть положительным числом или нулем');
    }
    if (depositAmount > 999999999) {
      errors.push('Залог слишком большой');
    }
  }

  // Проверка даты начала
  if (!startDate) {
    errors.push('Дата начала аренды обязательна');
  } else {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push('Некорректная дата начала аренды');
    }
  }

  // Проверка даты окончания
  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push('Некорректная дата окончания аренды');
    }

    if (startDate) {
      const start = new Date(startDate);

      // ДОБАВЬТЕ ЭТИ 2 СТРОКИ ДЛЯ НОРМАЛИЗАЦИИ
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end <= start) {
        errors.push('Дата окончания должна быть после даты начала');
      }
    }
  }

  // Проверка типа коммунальных платежей
  const validUtilitiesTypes = ['included', 'fixed', 'variable'];
  if (utilitiesType && !validUtilitiesTypes.includes(utilitiesType)) {
    errors.push('Недопустимый тип коммунальных платежей');
  }

  // Проверка коммунальных услуг (если тип fixed)
  if (utilitiesType === 'fixed' && req.body.utilities) {
    if (!Array.isArray(req.body.utilities)) {
      errors.push('Коммунальные услуги должны быть массивом');
    } else {
      req.body.utilities.forEach((utility, index) => {
        if (!utility.name || utility.name.trim() === '') {
          errors.push(`Название услуги #${index + 1} обязательно`);
        }
        if (!utility.amount || isNaN(parseFloat(utility.amount)) || parseFloat(utility.amount) <= 0) {
          errors.push(`Сумма услуги #${index + 1} должна быть положительным числом`);
        }
        if (utility.utilityTypeId && !/^[0-9a-fA-F]{24}$/.test(utility.utilityTypeId)) {
          errors.push(`Некорректный ID услуги #${index + 1}`);
        }
      });
    }
  }

  // Проверка общей суммы коммунальных платежей
  if (req.body.utilitiesAmount !== undefined && req.body.utilitiesAmount !== null) {
    const utilitiesAmount = parseFloat(req.body.utilitiesAmount);
    if (isNaN(utilitiesAmount) || utilitiesAmount < 0) {
      errors.push('Общая сумма коммунальных платежей должна быть положительным числом');
    }
  }

  // Проверка описания
  if (req.body.description && req.body.description.length > 1000) {
    errors.push('Описание не может быть длиннее 1000 символов');
  }

  // Проверка статуса
  const validStatuses = ['active', 'completed', 'cancelled'];
  if (req.body.status && !validStatuses.includes(req.body.status)) {
    errors.push('Недопустимый статус объекта');
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

// Валидация платежа по аренде
exports.validateRentPayment = (req, res, next) => {
  const { propertyId, amount, paymentDate, paymentType } = req.body;
  const errors = [];

  // Проверка ID объекта недвижимости
  if (!propertyId || propertyId.trim() === '') {
    errors.push('ID объекта недвижимости обязателен');
  } else if (!/^[0-9a-fA-F]{24}$/.test(propertyId)) {
    errors.push('Некорректный ID объекта недвижимости');
  }

  // Проверка суммы платежа
  if (!amount) {
    errors.push('Сумма платежа обязательна');
  } else {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Сумма платежа должна быть положительным числом');
    }
    if (amountNum > 999999999) {
      errors.push('Сумма платежа слишком большая');
    }
  }

  // Проверка даты платежа
  if (!paymentDate) {
    errors.push('Дата платежа обязательна');
  } else {
    const date = new Date(paymentDate);
    if (isNaN(date.getTime())) {
      errors.push('Некорректная дата платежа');
    }
  }

  // Проверка типа платежа
  const validPaymentTypes = ['rent', 'utilities', 'deposit', 'other'];
  if (!paymentType) {
    errors.push('Тип платежа обязателен');
  } else if (!validPaymentTypes.includes(paymentType)) {
    errors.push('Недопустимый тип платежа');
  }

  // Проверка статуса платежа
  const validStatuses = ['paid', 'pending', 'overdue', 'cancelled'];
  if (req.body.status && !validStatuses.includes(req.body.status)) {
    errors.push('Недопустимый статус платежа');
  }

  // Проверка примечаний
  if (req.body.notes && req.body.notes.length > 500) {
    errors.push('Примечания не могут быть длиннее 500 символов');
  }

  // Проверка файла квитанции
  if (req.body.receiptFile) {
    if (typeof req.body.receiptFile !== 'string') {
      errors.push('Файл квитанции должен быть строкой в формате Base64');
    } else if (!req.body.receiptFile.startsWith('data:')) {
      errors.push('Файл квитанции должен быть в формате Data URL');
    } else if (req.body.receiptFile.length > 7000000) {
      errors.push('Размер файла квитанции не должен превышать 5MB');
    }
  }

  // Проверка имени файла квитанции
  if (req.body.receiptFileName && req.body.receiptFileName.length > 255) {
    errors.push('Имя файла квитанции не может быть длиннее 255 символов');
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