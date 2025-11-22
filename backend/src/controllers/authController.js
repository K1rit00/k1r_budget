const User = require('../models/User');
const { verifyRefreshToken, SERVER_START_TIME } = require('../middleware/auth');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, login, password } = req.body;
    console.log('Registration attempt:', { firstName, lastName, login });

    // Check if user exists
    const existingUser = await User.findOne({ login });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким логином уже существует'
      });
    }

    console.log('Creating user...');
    // Create user
    const user = await User.create({
      firstName,
      lastName,
      login,
      password,
      lastActivity: Date.now(),
      serverStartTime: SERVER_START_TIME
    });
    console.log('User created:', user._id);

    console.log('Generating tokens...');
    // Generate tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    console.log('Saving refresh token...');
    // Save refresh token and set activity
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    user.lastActivity = Date.now();
    await user.save();

    console.log('Registration successful');
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          fullName: user.fullName
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Registration error details:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при регистрации',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { login, password } = req.body;

    // Validate input
    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: 'Укажите логин и пароль'
      });
    }

    // Find user with password
    const user = await User.findOne({ login }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный логин или пароль'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Неверный логин или пароль'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Аккаунт деактивирован'
      });
    }

    // Generate tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Update user
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    user.lastActivity = Date.now();
    user.serverStartTime = SERVER_START_TIME;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          fullName: user.fullName,
          currency: user.currency
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при входе',
      error: error.message
    });
  }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token не предоставлен',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Недействительный refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Check if session is valid
    if (!user.isSessionValid(SERVER_START_TIME)) {
      // Clear refresh token
      user.refreshToken = undefined;
      await user.save();
      
      return res.status(401).json({
        success: false,
        message: 'Сессия истекла. Пожалуйста, войдите снова',
        code: 'SESSION_EXPIRED'
      });
    }

    // Generate new tokens
    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    // Update refresh token and activity
    user.refreshToken = newRefreshToken;
    user.lastActivity = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Недействительный refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.refreshToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Выход выполнен успешно'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при выходе'
    });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          fullName: user.fullName,
          currency: user.currency,
          lastLogin: user.lastLogin,
          // Добавляем недостающие поля:
          phone: user.phone,
          birthDate: user.birthDate,
          settings: user.settings
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения данных пользователя'
    });
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Валидация
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Укажите текущий и новый пароль'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Новый пароль должен содержать минимум 6 символов'
      });
    }

    // Получаем пользователя с паролем
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверяем текущий пароль
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Неверный текущий пароль'
      });
    }

    // Проверяем, что новый пароль отличается от текущего
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Новый пароль должен отличаться от текущего'
      });
    }

    // Устанавливаем новый пароль (хеширование в pre-save hook)
    user.password = newPassword;
    await user.save();

    // Генерируем новые токены для безопасности
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Пароль успешно изменен',
      data: {
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при смене пароля',
      error: error.message
    });
  }
};


// Update User Profile
exports.updateProfile = async (req, res) => {
  try {

    const { 
      firstName, 
      lastName, 
      phone, 
      birthDate, 
      settings 
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    // Обновление простых полей
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (birthDate) user.birthDate = birthDate;
    
    // Обновление настроек (Settings)
    if (settings) {
      // ВАЖНО: Преобразуем текущие настройки в обычный объект перед слиянием, 
      // иначе Mongoose может сохранить мусор или не сохранить ничего.
      const currentSettings = user.settings ? user.settings.toObject() : {};
      
      user.settings = {
        ...currentSettings,
        ...settings
      };
      
      // Синхронизация корневой валюты для совместимости
      if (settings.currency) {
        user.currency = settings.currency; 
      }

      // ВАЖНО: Явно сообщаем Mongoose, что поле settings изменилось
      user.markModified('settings');
    }

    // Сохраняем
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error); // 3. Лог ошибки
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Этот логин уже занят' 
      });
    }
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении профиля',
      error: error.message
    });
  }
};