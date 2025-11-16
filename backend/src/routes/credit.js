const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
const { protect } = require('../middleware/auth');
const { validateCredit, validateCreditPayment } = require('../middleware/validation');

// Все роуты требуют аутентификации
router.use(protect);

/**
 * @route   GET /api/v1/credits
 * @desc    Получить все кредиты пользователя
 * @access  Private
 * @query   status - фильтр по статусу (active, paid, overdue, cancelled)
 * @query   bank - фильтр по банку (ObjectId)
 * @query   type - фильтр по типу (credit, loan, installment)
 * @query   sortBy - поле для сортировки (createdAt, amount, endDate и т.д.)
 * @query   order - порядок сортировки (asc, desc)
 */
router.get('/', creditController.getCredits);

/**
 * @route   GET /api/v1/credits/statistics
 * @desc    Получить статистику по кредитам
 * @access  Private
 */
router.get('/statistics', creditController.getStatistics);

/**
 * @route   GET /api/v1/credits/upcoming
 * @desc    Получить предстоящие платежи
 * @access  Private
 * @query   days - количество дней вперед (по умолчанию 7)
 */
router.get('/upcoming', creditController.getUpcomingPayments);

/**
 * @route   GET /api/v1/credits/payments
 * @desc    Получить все платежи пользователя по всем кредитам
 * @access  Private
 * @query   startDate - начальная дата фильтра
 * @query   endDate - конечная дата фильтра
 * @query   status - фильтр по статусу платежа
 */
router.get('/payments', creditController.getAllPayments);

/**
 * @route   POST /api/v1/credits/pay-monthly
 * @desc    Погасить ежемесячные платежи для всех активных кредитов
 * @access  Private
 */
router.post('/pay-monthly', creditController.payMonthlyPayments);

/**
 * @route   GET /api/v1/credits/:id
 * @desc    Получить кредит по ID
 * @access  Private
 */
router.get('/:id', creditController.getCreditById);

/**
 * @route   POST /api/v1/credits
 * @desc    Создать новый кредит
 * @access  Private
 * @body    {
 * name: string (required),
 * bank: ObjectId (required),
 * amount: number (required),
 * interestRate: number (required),
 * monthlyPayment: number (required),
 * monthlyPaymentDate: number (1-31, required),
 * startDate: date (required),
 * termInMonths: number (required), // <<< ИЗМЕНЕНИЕ
 * type: string (credit|loan|installment, required),
 * description: string (optional),
 * accountNumber: string (optional, will be encrypted),
 * contractNumber: string (optional, will be encrypted)
 * }
 */
router.post('/', validateCredit, creditController.createCredit);

/**
 * @route   PUT /api/v1/credits/:id
 * @desc    Обновить кредит
 * @access  Private
 * @body    Любые поля из схемы кредита
 */
router.put('/:id', validateCredit, creditController.updateCredit);

/**
 * @route   DELETE /api/v1/credits/:id
 * @desc    Удалить кредит и все связанные платежи
 * @access  Private
 */
router.delete('/:id', creditController.deleteCredit);

/**
 * @route   POST /api/v1/credits/:id/payments
 * @desc    Добавить платеж по кредиту
 * @access  Private
 * @body    {
 *            amount: number (required),
 *            paymentDate: date (optional, default: today),
 *            principalAmount: number (optional, default: amount),
 *            interestAmount: number (optional, default: 0),
 *            notes: string (optional),
 *            receiptNumber: string (optional, will be encrypted)
 *          }
 */
router.post('/:id/payments', validateCreditPayment, creditController.addPayment);

/**
 * @route   GET /api/v1/credits/:id/payments
 * @desc    Получить все платежи по конкретному кредиту
 * @access  Private
 */
router.get('/:id/payments', creditController.getPayments);

module.exports = router;