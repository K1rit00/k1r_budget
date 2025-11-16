const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Имя обязательно'],
    trim: true,
    maxlength: [50, 'Имя не может быть длиннее 50 символов']
  },
  lastName: {
    type: String,
    required: [true, 'Фамилия обязательна'],
    trim: true,
    maxlength: [50, 'Фамилия не может быть длиннее 50 символов']
  },
  login: {
    type: String,
    required: [true, 'Логин обязателен'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Логин должен содержать минимум 3 символа'],
    maxlength: [30, 'Логин не может быть длиннее 30 символов'],
    match: [/^[a-z0-9_-]+$/, 'Логин может содержать только буквы, цифры, _ и -']
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен содержать минимум 6 символов'],
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  currency: {
    type: String,
    default: 'KZT',
    enum: ['KZT', 'RUB', 'USD', 'EUR']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  serverStartTime: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ login: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, config.bcryptRounds);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, login: this.login },
    config.jwt.secret,
    { expiresIn: config.jwt.expire }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpire }
  );
};

// Check if session is valid (not expired)
userSchema.methods.isSessionValid = function(serverStartTime) {
  const ONE_HOUR = 60 * 60 * 1000; // 1 час в миллисекундах
  const now = Date.now();

  console.log('--- Проверка isSessionValid ---');
  console.log('User lastLogin:', this.lastLogin);
  console.log('Server startTime:', serverStartTime);

  // Проверка 1: Сервер был перезапущен
  if (!this.lastLogin) {
    console.log('РЕЗУЛЬТАТ: false (нет lastLogin)');
    return false;
  }
  if (this.lastLogin < serverStartTime) {
    console.log('РЕЗУЛЬТАТ: false (lastLogin < serverStartTime)');
    return false;
  }
  
  // Проверка 2: Последняя активность была более 1 часа назад
  if (this.lastActivity && (now - this.lastActivity.getTime()) > ONE_HOUR) {
    console.log('РЕЗУЛЬТАТ: false (неактивность > 1 часа)');
    return false;
  }
  
  console.log('РЕЗУЛЬТАТ: true (сессия валидна)');
  return true;
};

// Update last activity timestamp
userSchema.methods.updateActivity = async function() {
  this.lastActivity = Date.now();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);