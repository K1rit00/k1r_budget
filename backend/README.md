# K1r Budget Backend API

Backend API для системы учёта бюджета с MongoDB Atlas, JWT авторизацией и шифрованием данных.

## Особенности

- ✅ MongoDB Atlas подключение
- ✅ JWT авторизация (Access + Refresh токены)
- ✅ AES-256 шифрование чувствительных данных
- ✅ RESTful API
- ✅ Валидация запросов
- ✅ Rate limiting
- ✅ CORS настройка
- ✅ Обработка ошибок
- ✅ Логирование

## Установка

### 1. Создание структуры проекта

Запустите `setup-backend.bat` для автоматического создания всех файлов и папок:

```bash
setup-backend.bat
```

### 2. Установка зависимостей

```bash
cd backend
npm install
```

### 3. Настройка переменных окружения

Скопируйте `.env.development` и настройте параметры:

- **MONGODB_URI** - строка подключения к MongoDB Atlas
- **JWT_SECRET** - секретный ключ для JWT токенов
- **ENCRYPTION_KEY** - ключ шифрования (32 байта в base64)

Для production используйте `.env.production`.

## Запуск

### Development режим

```bash
npm run dev
```

Сервер запустится на `http://localhost:5000`

### Production режим

```bash
NODE_ENV=production npm start
```

## API Endpoints

### Авторизация

- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/refresh` - Обновление токена
- `POST /api/v1/auth/logout` - Выход
- `GET /api/v1/auth/me` - Получить текущего пользователя

### Расходы

- `GET /api/v1/expenses` - Получить все расходы
- `GET /api/v1/expenses/:id` - Получить расход
- `POST /api/v1/expenses` - Создать расход
- `PUT /api/v1/expenses/:id` - Обновить расход
- `DELETE /api/v1/expenses/:id` - Удалить расход
- `GET /api/v1/expenses/stats` - Статистика расходов

### Доходы

- `GET /api/v1/income` - Получить все доходы
- `GET /api/v1/income/:id` - Получить доход
- `POST /api/v1/income` - Создать доход
- `PUT /api/v1/income/:id` - Обновить доход
- `DELETE /api/v1/income/:id` - Удалить доход
- `GET /api/v1/income/stats` - Статистика доходов

### Категории

- `GET /api/v1/categories` - Получить все категории
- `GET /api/v1/categories/:id` - Получить категорию
- `POST /api/v1/categories` - Создать категорию
- `PUT /api/v1/categories/:id` - Обновить категорию
- `DELETE /api/v1/categories/:id` - Удалить категорию

## Примеры запросов

### Регистрация

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Иван",
    "lastName": "Петров",
    "email": "ivan@example.com",
    "password": "123456"
  }'
```

### Вход

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan@example.com",
    "password": "123456"
  }'
```

### Создание расхода

```bash
curl -X POST http://localhost:5000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "category": "Продукты",
    "amount": 5000,
    "description": "Покупка в магазине",
    "date": "2025-11-03"
  }'
```

## Безопасность

### Шифрование данных

Все чувствительные данные (суммы) шифруются с помощью AES-256-GCM перед сохранением в базу данных и расшифровываются при чтении.

### JWT токены

- **Access Token** - срок действия 7 дней
- **Refresh Token** - срок действия 30 дней

### Rate Limiting

По умолчанию: 100 запросов за 15 минут на каждый IP.

## Структура проекта

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Подключение MongoDB
│   │   └── env.js           # Конфигурация из .env
│   ├── models/              # Mongoose модели
│   ├── controllers/         # Контроллеры API
│   ├── services/            # Бизнес-логика
│   ├── middleware/          # Middleware
│   ├── routes/              # Маршруты API
│   ├── utils/               # Утилиты
│   └── server.js            # Точка входа
├── .env.development         # Dev переменные
├── .env.production          # Prod переменные
└── package.json
```

## Тестирование

Для тестирования API рекомендуется использовать:
- Postman
- Insomnia
- Thunder Client (VS Code расширение)

## Troubleshooting

### Ошибка подключения к MongoDB

Убедитесь, что:
- IP адрес добавлен в whitelist MongoDB Atlas
- Правильный формат строки подключения
- Пользователь имеет необходимые права

### Ошибки шифрования

Проверьте, что `ENCRYPTION_KEY` имеет длину 32 байта в base64 формате.

## Лицензия

ISC