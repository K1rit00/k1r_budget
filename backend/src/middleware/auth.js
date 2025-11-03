const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Не авторизован, токен не предоставлен'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Аккаунт деактивирован'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Недействительный токен'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Ошибка авторизации'
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

module.exports = { protect, verifyRefreshToken };