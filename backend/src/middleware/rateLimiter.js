const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const limiter = rateLimit({
  // Устанавливаем окно в 15 минут
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  
  message: {
    success: false,
    message: 'Слишком много запросов, попробуйте позже'
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Опционально: пропускать OPTIONS запросы (preflight), чтобы они не тратили лимит
  skip: (req) => req.method === 'OPTIONS',
});

module.exports = limiter;