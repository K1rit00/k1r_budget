const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const path = require('path');
const { connectDB } = require('./config/database');
const { config } = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const app = express();

// Connect to MongoDB
connectDB();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false // для работы React
}));
app.use(mongoSanitize());

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Rate Limiting
app.use('/api', rateLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API Routes
app.use(`/api/${config.apiVersion}`, routes);

// ===== SERVE FRONTEND =====
if (config.env === 'production') {
  // Статические файлы из build папки
  app.use(express.static(path.join(__dirname, '../../build')));
  
  // Все остальные запросы -> index.html (для React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build', 'index.html'));
  });
}

// Error Handler
app.use(errorHandler);

// Start Server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running in ${config.env} mode on port ${PORT}`);
  logger.info(`API version: ${config.apiVersion}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

module.exports = app;