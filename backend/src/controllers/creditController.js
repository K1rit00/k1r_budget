const Credit = require('../models/Credit');
const CreditPayment = require('../models/CreditPayment');
const Bank = require('../models/Bank');
const encryptionService = require('../services/encryptionService');

// Поля для шифрования
const ENCRYPTED_FIELDS = ['accountNumber', 'contractNumber'];

/**
 * Получить все кредиты пользователя
 */
exports.getCredits = async (req, res) => {
    try {
        const { status, bank, type, sortBy = 'createdAt', order = 'desc' } = req.query;

        const filter = { user: req.user.id };

        if (status) filter.status = status;
        if (bank) filter.bank = bank;
        if (type) filter.type = type;

        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = { [sortBy]: sortOrder };

        const credits = await Credit.find(filter)
            .populate('bank', 'name description')
            .sort(sortOptions)
            .lean();

        // Расшифровка данных
        const decryptedCredits = credits.map(credit => {
            const decrypted = { ...credit };

            if (credit.encryptedAccountNumber) {
                decrypted.accountNumber = encryptionService.decrypt(credit.encryptedAccountNumber);
                delete decrypted.encryptedAccountNumber;
            }

            if (credit.encryptedContractNumber) {
                decrypted.contractNumber = encryptionService.decrypt(credit.encryptedContractNumber);
                delete decrypted.encryptedContractNumber;
            }

            return decrypted;
        });

        res.json({
            success: true,
            data: decryptedCredits
        });
    } catch (error) {
        console.error('Error fetching credits:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении кредитов',
            error: error.message
        });
    }
};

/**
 * Получить кредит по ID
 */
exports.getCreditById = async (req, res) => {
    try {
        const credit = await Credit.findOne({
            _id: req.params.id,
            user: req.user.id
        })
            .populate('bank', 'name description')
            .lean();

        if (!credit) {
            return res.status(404).json({
                success: false,
                message: 'Кредит не найден'
            });
        }

        // Расшифровка данных
        const decrypted = { ...credit };

        if (credit.encryptedAccountNumber) {
            decrypted.accountNumber = encryptionService.decrypt(credit.encryptedAccountNumber);
            delete decrypted.encryptedAccountNumber;
        }

        if (credit.encryptedContractNumber) {
            decrypted.contractNumber = encryptionService.decrypt(credit.encryptedContractNumber);
            delete decrypted.encryptedContractNumber;
        }

        res.json({
            success: true,
            data: decrypted
        });
    } catch (error) {
        console.error('Error fetching credit:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении кредита',
            error: error.message
        });
    }
};

/**
 * Создать новый кредит
 */
exports.createCredit = async (req, res) => {
    try {
        const {
            name,
            bank,
            amount,
            interestRate,
            isOldCredit, // НОВОЕ ПОЛЕ
            initialDebt, // НОВОЕ ПОЛЕ
            monthlyPayment,
            monthlyPaymentDate,
            startDate,
            endDate,
            type,
            description,
            accountNumber,
            contractNumber
        } = req.body;

        const bankExists = await Bank.findOne({
            _id: bank,
            userId: req.user.id
        });

        if (!bankExists) {
            console.log('Bank not found for user:', { bankId: bank, userId: req.user.id });
            return res.status(404).json({
                success: false,
                message: 'Банк не найден. Убедитесь, что банк принадлежит вашему аккаунту.'
            });
        }

        // Подготовка данных с шифрованием
        const creditData = {
            user: req.user.id,
            name,
            bank,
            amount,
            currentBalance: isOldCredit && initialDebt ? initialDebt : amount,
            interestRate,
            isOldCredit: isOldCredit || false,
            initialDebt: isOldCredit ? initialDebt : undefined,
            monthlyPayment,
            monthlyPaymentDate,
            startDate,
            endDate,
            type,
            status: 'active',
            description
        };

        // Шифрование конфиденциальных полей
        if (accountNumber) {
            creditData.encryptedAccountNumber = encryptionService.encrypt(accountNumber);
        }

        if (contractNumber) {
            creditData.encryptedContractNumber = encryptionService.encrypt(contractNumber);
        }

        const credit = await Credit.create(creditData);

        // Загружаем кредит с populate для ответа
        const populatedCredit = await Credit.findById(credit._id)
            .populate('bank', 'name description')
            .lean();

        // Расшифровка для ответа
        const decrypted = { ...populatedCredit };

        if (populatedCredit.encryptedAccountNumber) {
            decrypted.accountNumber = encryptionService.decrypt(populatedCredit.encryptedAccountNumber);
            delete decrypted.encryptedAccountNumber;
        }

        if (populatedCredit.encryptedContractNumber) {
            decrypted.contractNumber = encryptionService.decrypt(populatedCredit.encryptedContractNumber);
            delete decrypted.encryptedContractNumber;
        }

        res.status(201).json({
            success: true,
            message: 'Кредит успешно создан',
            data: decrypted
        });
    } catch (error) {
        console.error('Error creating credit:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании кредита',
            error: error.message
        });
    }
};

/**
 * Обновить кредит
 */
exports.updateCredit = async (req, res) => {
    try {
        const credit = await Credit.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!credit) {
            return res.status(404).json({
                success: false,
                message: 'Кредит не найден'
            });
        }

        const {
            name,
            bank,
            amount,
            interestRate,
            isOldCredit, // НОВОЕ ПОЛЕ
            initialDebt, // НОВОЕ ПОЛЕ
            monthlyPayment,
            monthlyPaymentDate,
            startDate,
            endDate,
            type,
            status,
            description,
            accountNumber,
            contractNumber
        } = req.body;

        // ИСПРАВЛЕНО: Если меняется банк, проверяем его существование с правильным полем userId
        if (bank && bank !== credit.bank.toString()) {
            const bankExists = await Bank.findOne({
                _id: bank,
                userId: req.user.id
            });

            if (!bankExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Банк не найден. Убедитесь, что банк принадлежит вашему аккаунту.'
                });
            }
            credit.bank = bank;
        }

        // Обновление основных полей
        if (name !== undefined) credit.name = name;
        if (amount !== undefined) credit.amount = amount;
        if (interestRate !== undefined) credit.interestRate = interestRate;
        if (monthlyPayment !== undefined) credit.monthlyPayment = monthlyPayment;
        if (monthlyPaymentDate !== undefined) credit.monthlyPaymentDate = monthlyPaymentDate;
        if (startDate !== undefined) credit.startDate = startDate;
        if (endDate !== undefined) credit.endDate = endDate;
        if (type !== undefined) credit.type = type;
        if (status !== undefined) credit.status = status;
        if (description !== undefined) credit.description = description;
        if (isOldCredit !== undefined) credit.isOldCredit = isOldCredit;
        if (initialDebt !== undefined) credit.initialDebt = initialDebt;

        // Шифрование конфиденциальных полей
        if (accountNumber !== undefined) {
            credit.encryptedAccountNumber = accountNumber ? encryptionService.encrypt(accountNumber) : null;
        }

        if (contractNumber !== undefined) {
            credit.encryptedContractNumber = contractNumber ? encryptionService.encrypt(contractNumber) : null;
        }

        await credit.save();

        // Загружаем обновленный кредит с populate
        const updatedCredit = await Credit.findById(credit._id)
            .populate('bank', 'name description')
            .lean();

        // Расшифровка для ответа
        const decrypted = { ...updatedCredit };

        if (updatedCredit.encryptedAccountNumber) {
            decrypted.accountNumber = encryptionService.decrypt(updatedCredit.encryptedAccountNumber);
            delete decrypted.encryptedAccountNumber;
        }

        if (updatedCredit.encryptedContractNumber) {
            decrypted.contractNumber = encryptionService.decrypt(updatedCredit.encryptedContractNumber);
            delete decrypted.encryptedContractNumber;
        }

        res.json({
            success: true,
            message: 'Кредит успешно обновлен',
            data: decrypted
        });
    } catch (error) {
        console.error('Error updating credit:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении кредита',
            error: error.message
        });
    }
};

/**
 * Удалить кредит
 */
exports.deleteCredit = async (req, res) => {
    try {
        const credit = await Credit.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!credit) {
            return res.status(404).json({
                success: false,
                message: 'Кредит не найден'
            });
        }

        // Удаляем все связанные платежи
        await CreditPayment.deleteMany({ credit: credit._id, user: req.user.id });

        await credit.deleteOne();

        res.json({
            success: true,
            message: 'Кредит и связанные платежи успешно удалены'
        });
    } catch (error) {
        console.error('Error deleting credit:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении кредита',
            error: error.message
        });
    }
};

/**
 * Добавить платеж по кредиту
 */
exports.addPayment = async (req, res) => {
    try {
        const { amount, paymentDate, principalAmount, interestAmount, notes, receiptNumber } = req.body;

        const credit = await Credit.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!credit) {
            return res.status(404).json({
                success: false,
                message: 'Кредит не найден'
            });
        }

        if (credit.status === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Кредит уже полностью погашен'
            });
        }

        // Проверка суммы платежа
        if (amount > credit.currentBalance) {
            return res.status(400).json({
                success: false,
                message: 'Сумма платежа превышает остаток долга'
            });
        }

        // Создание платежа с шифрованием
        const paymentData = {
            user: req.user.id,
            credit: credit._id,
            amount,
            paymentDate: paymentDate || new Date(),
            principalAmount: principalAmount || amount,
            interestAmount: interestAmount || 0,
            status: 'paid',
            notes
        };

        if (receiptNumber) {
            paymentData.encryptedReceiptNumber = encryptionService.encrypt(receiptNumber);
        }

        const payment = await CreditPayment.create(paymentData);

        // Обновляем баланс кредита
        credit.currentBalance = Math.max(0, credit.currentBalance - amount);

        // Автоматически меняем статус на "paid" если баланс = 0
        if (credit.currentBalance === 0) {
            credit.status = 'paid';
        }

        await credit.save();

        // Расшифровка для ответа
        const decryptedPayment = payment.toObject();
        if (payment.encryptedReceiptNumber) {
            decryptedPayment.receiptNumber = encryptionService.decrypt(payment.encryptedReceiptNumber);
            delete decryptedPayment.encryptedReceiptNumber;
        }

        res.status(201).json({
            success: true,
            message: 'Платеж успешно добавлен',
            data: {
                payment: decryptedPayment,
                credit: {
                    id: credit._id,
                    currentBalance: credit.currentBalance,
                    status: credit.status
                }
            }
        });
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при добавлении платежа',
            error: error.message
        });
    }
};

/**
 * Получить платежи по кредиту
 */
exports.getPayments = async (req, res) => {
    try {
        const credit = await Credit.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!credit) {
            return res.status(404).json({
                success: false,
                message: 'Кредит не найден'
            });
        }

        const payments = await CreditPayment.find({
            credit: credit._id,
            user: req.user.id
        })
            .sort({ paymentDate: -1 })
            .lean();

        // Расшифровка данных
        const decryptedPayments = payments.map(payment => {
            const decrypted = { ...payment };

            if (payment.encryptedReceiptNumber) {
                decrypted.receiptNumber = encryptionService.decrypt(payment.encryptedReceiptNumber);
                delete decrypted.encryptedReceiptNumber;
            }

            return decrypted;
        });

        res.json({
            success: true,
            data: decryptedPayments
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении платежей',
            error: error.message
        });
    }
};

/**
 * Получить все платежи пользователя
 */
exports.getAllPayments = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;

        const filter = { user: req.user.id };

        if (status) filter.status = status;

        if (startDate || endDate) {
            filter.paymentDate = {};
            if (startDate) filter.paymentDate.$gte = new Date(startDate);
            if (endDate) filter.paymentDate.$lte = new Date(endDate);
        }

        const payments = await CreditPayment.find(filter)
            .populate({
                path: 'credit',
                populate: { path: 'bank', select: 'name' }
            })
            .sort({ paymentDate: -1 })
            .lean();

        // Расшифровка данных
        const decryptedPayments = payments.map(payment => {
            const decrypted = { ...payment };

            if (payment.encryptedReceiptNumber) {
                decrypted.receiptNumber = encryptionService.decrypt(payment.encryptedReceiptNumber);
                delete decrypted.encryptedReceiptNumber;
            }

            return decrypted;
        });

        res.json({
            success: true,
            data: decryptedPayments
        });
    } catch (error) {
        console.error('Error fetching all payments:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении платежей',
            error: error.message
        });
    }
};

/**
 * Получить статистику по кредитам
 */
exports.getStatistics = async (req, res) => {
    try {
        const statistics = await Credit.getStatistics(req.user.id);

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении статистики',
            error: error.message
        });
    }
};

/**
 * Получить предстоящие платежи
 */
exports.getUpcomingPayments = async (req, res) => {
    try {
        const daysAhead = parseInt(req.query.days) || 7;

        const upcomingPayments = await Credit.getUpcomingPayments(req.user.id, daysAhead);

        res.json({
            success: true,
            data: upcomingPayments
        });
    } catch (error) {
        console.error('Error fetching upcoming payments:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении предстоящих платежей',
            error: error.message
        });
    }
};

/**
 * Погасить ежемесячные платежи для всех активных кредитов
 */
exports.payMonthlyPayments = async (req, res) => {
    try {
        const activeCredits = await Credit.find({
            user: req.user.id,
            status: 'active'
        });

        if (activeCredits.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Нет активных кредитов для погашения'
            });
        }

        const today = new Date();
        const payments = [];
        const updatedCredits = [];

        for (const credit of activeCredits) {
            // Создаем платеж
            const payment = await CreditPayment.create({
                user: req.user.id,
                credit: credit._id,
                amount: credit.monthlyPayment,
                paymentDate: today,
                principalAmount: credit.monthlyPayment,
                interestAmount: 0,
                status: 'paid'
            });

            payments.push(payment);

            // Обновляем баланс кредита
            credit.currentBalance = Math.max(0, credit.currentBalance - credit.monthlyPayment);

            if (credit.currentBalance === 0) {
                credit.status = 'paid';
            }

            await credit.save();
            updatedCredits.push(credit);
        }

        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

        res.json({
            success: true,
            message: `Погашено ${payments.length} платежей на общую сумму ${totalAmount.toFixed(2)} ₸`,
            data: {
                paymentsCount: payments.length,
                totalAmount,
                payments,
                updatedCredits
            }
        });
    } catch (error) {
        console.error('Error paying monthly payments:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при погашении ежемесячных платежей',
            error: error.message
        });
    }
};