const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const User = require('../models/User');

// Время запуска сервера
const SERVER_START_TIME = new Date();
console.log('--- НОВЫЙ ЗАПУСК БЭКЕНД СЕРВЕРА ---');
console.log('SERVER_START_TIME установлен на:', SERVER_START_TIME);

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Не авторизован, токен не предоставлен',
        code: 'NO_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не найден',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Аккаунт деактивирован',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Проверяем валидность сессии
      if (!req.user.isSessionValid(SERVER_START_TIME)) {
        // Очищаем refresh token
        req.user.refreshToken = undefined;
        await req.user.save();
        
        return res.status(401).json({
          success: false,
          message: 'Сессия истекла. Пожалуйста, войдите снова',
          code: 'SESSION_EXPIRED'
        });
      }

      // Обновляем время последней активности
      req.user.lastActivity = Date.now();
      await req.user.save();

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Токен истёк',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Недействительный токен',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Ошибка авторизации',
      code: 'AUTH_ERROR'
    });
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    throw new Error('Недействительный refresh token');
  }
};

module.exports = { protect, verifyRefreshToken, SERVER_START_TIME };