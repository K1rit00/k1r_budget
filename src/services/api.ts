import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh and session expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for session expired error
    if (error.response?.data?.code === 'SESSION_EXPIRED') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('session-expired'));
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Check if session expired during refresh
        if (refreshError.response?.data?.code === 'SESSION_EXPIRED') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.dispatchEvent(new Event('session-expired'));
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Types
interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  fullName: string;
  currency?: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: UserData;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

interface LoginCredentials {
  login: string;
  password: string;
}

interface RegisterCredentials {
  firstName: string;
  lastName: string;
  login: string;
  password: string;
}

// Auth API
export const apiService = {
  // Authentication
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    const { accessToken, refreshToken } = response.data.data.tokens;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', credentials);
    const { accessToken, refreshToken } = response.data.data.tokens;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update User Profile
  updateProfile: async (data: any) => {
    console.log('Sending data to update:', data); // Проверка, что уходит с фронта
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  // Get saved user from token (checks if user is authenticated)
  getSavedUser: async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return null;
      }

      const response = await api.get('/auth/me');
      if (response.data.success) {
        return {
          email: response.data.data.user.login,
          name: response.data.data.user.fullName || response.data.data.user.firstName,
          id: response.data.data.user.id
        };
      }
      return null;
    } catch (error: any) {
      // If token is invalid or session expired, clear it
      if (error.response?.data?.code === 'SESSION_EXPIRED') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const accessToken = localStorage.getItem('accessToken');
    return !!accessToken;
  },

  // Expenses
  getExpenses: async (params?: any) => {
    const response = await api.get('/expenses', { params });
    return response.data;
  },

  createExpense: async (data: any) => {
    const response = await api.post('/expenses', data);
    return response.data;
  },

  updateExpense: async (id: string, data: any) => {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
  },

  deleteExpense: async (id: string) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  // Income
  getIncome: async (params?: any) => {
    const response = await api.get('/income', { params });
    return response.data;
  },

  createIncome: async (data: any) => {
    const response = await api.post('/income', data);
    return response.data;
  },

  updateIncome: async (id: string, data: any) => {
    const response = await api.put(`/income/${id}`, data);
    return response.data;
  },

  deleteIncome: async (id: string) => {
    const response = await api.delete(`/income/${id}`);
    return response.data;
  },

  // Recurring Income (Регулярные доходы)
  getRecurringIncomes: async () => {
    const response = await api.get('/recurring-income');
    return response.data;
  },

  createRecurringIncome: async (data: any) => {
    const response = await api.post('/recurring-income', data);
    return response.data;
  },

  updateRecurringIncome: async (id: string, data: any) => {
    const response = await api.put(`/recurring-income/${id}`, data);
    return response.data;
  },

  deleteRecurringIncome: async (id: string) => {
    const response = await api.delete(`/recurring-income/${id}`);
    return response.data;
  },

  toggleRecurringIncome: async (id: string) => {
    const response = await api.patch(`/recurring-income/${id}/toggle`);
    return response.data;
  },

  processRecurringIncomes: async () => {
    const response = await api.post('/recurring-income/process');
    return response.data;
  },

  getRecurringIncomeHistory: async (id: string) => {
    const response = await api.get(`/recurring-income/${id}/history`);
    return response.data;
  },

  // Get available incomes (с остатками для пополнения депозитов)
  getAvailableIncomes: async () => {
    const response = await api.get('/deposits/available-incomes');
    return response.data;
  },

  getIncomeUsageHistory: async () => {
    // Предполагаем, что такой маршрут существует для получения истории из IncomeUsage
    const response = await api.get('/income/usage/history');
    return response.data;
  },

  // Categories
  getCategories: async (type?: 'expense' | 'income') => {
    const response = await api.get('/categories', { params: { type } });
    return response.data;
  },

  createCategory: async (data: any) => {
    const response = await api.post('/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: any) => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Credits (Кредиты)
  getCredits: async (params?: { status?: string; bank?: string; type?: string; sortBy?: string; order?: string }) => {
    const response = await api.get('/credits', { params });
    return response.data;
  },

  getCreditById: async (id: string) => {
    const response = await api.get(`/credits/${id}`);
    return response.data;
  },

  createCredit: async (data: {
    name: string;
    bank: string;
    amount: number;
    interestRate: number;
    isOldCredit?: boolean;
    initialDebt?: number;
    monthlyPayment: number;
    monthlyPaymentDate: number;
    startDate: string;
    termInMonths: number; // <<< ИЗМЕНЕНИЕ
    type: 'credit' | 'loan' | 'installment';
    description?: string;
    accountNumber?: string;
    contractNumber?: string;
  }) => {
    const response = await api.post('/credits', data);
    return response.data;
  },

  updateCredit: async (id: string, data: {
    name?: string;
    bank?: string;
    amount?: number;
    currentBalance?: number;
    interestRate?: number;
    monthlyPayment?: number;
    monthlyPaymentDate?: number;
    startDate?: string;
    termInMonths?: number; // <<< ИЗМЕНЕНИЕ
    type?: 'credit' | 'loan' | 'installment';
    status?: 'active' | 'paid' | 'overdue' | 'cancelled';
    description?: string;
    accountNumber?: string;
    contractNumber?: string;
    isOldCredit?: boolean;
    initialDebt?: number;
  }) => {
    const response = await api.put(`/credits/${id}`, data);
    return response.data;
  },

  deleteCredit: async (id: string) => {
    const response = await api.delete(`/credits/${id}`);
    return response.data;
  },

  // Credit Payments (Платежи по кредитам)
  addPayment: async (creditId: string, data: {
    amount: number;
    paymentDate?: string;
    principalAmount?: number;
    interestAmount?: number;
    notes?: string;
    receiptNumber?: string;
  }) => {
    const response = await api.post(`/credits/${creditId}/payments`, data);
    return response.data;
  },

  getCreditPayments: async (creditId: string) => {
    const response = await api.get(`/credits/${creditId}/payments`);
    return response.data;
  },

  getAllPayments: async (params?: { startDate?: string; endDate?: string; status?: string }) => {
    const response = await api.get('/credits/payments', { params });
    return response.data;
  },

  // Credit Statistics & Utilities
  getCreditStatistics: async () => {
    const response = await api.get('/credits/statistics');
    return response.data;
  },

  getUpcomingPayments: async (days?: number) => {
    const response = await api.get('/credits/upcoming', { params: { days } });
    return response.data;
  },

  payMonthlyPayments: async () => {
    const response = await api.post('/credits/pay-monthly');
    return response.data;
  },

  // Monthly Expenses
  getMonthlyExpenses: async (params?: any) => {
    const response = await api.get('/monthly-expenses', { params });
    return response.data;
  },

  getExpenseTransactionsHistory: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/monthly-expenses/transactions/history', { params });
    return response.data;
  },

  createMonthlyExpense: async (data: any) => {
    const response = await api.post('/monthly-expenses', data);
    return response.data;
  },

  transferRecurringExpenses: async (data: { sourceIncomeId: string, currentMonthDate: string }) => {
    const response = await api.post('/monthly-expenses/transfer', data);
    return response.data;
  },

  updateMonthlyExpense: async (id: string, data: any) => {
    const response = await api.put(`/monthly-expenses/${id}`, data);
    return response.data;
  },

  deleteMonthlyExpense: async (id: string) => {
    const response = await api.delete(`/monthly-expenses/${id}`);
    return response.data;
  },

  // Rent
  getRent: async () => {
    const response = await api.get('/rent');
    return response.data;
  },

  createRent: async (data: any) => {
    const response = await api.post('/rent', data);
    return response.data;
  },

  updateRent: async (id: string, data: any) => {
    const response = await api.put(`/rent/${id}`, data);
    return response.data;
  },

  deleteRent: async (id: string) => {
    const response = await api.delete(`/rent/${id}`);
    return response.data;
  },

  // Utilities
  getUtilities: async () => {
    const response = await api.get('/utilities');
    return response.data;
  },

  createUtility: async (data: any) => {
    const response = await api.post('/utilities', data);
    return response.data;
  },

  updateUtility: async (id: string, data: any) => {
    const response = await api.put(`/utilities/${id}`, data);
    return response.data;
  },

  deleteUtility: async (id: string) => {
    const response = await api.delete(`/utilities/${id}`);
    return response.data;
  },

  // Rent Properties
  getRentProperties: async (params?: { status?: string; startDate?: string; endDate?: string }) => {
    const response = await api.get('/rent', { params });
    return response.data;
  },

  getRentProperty: async (id: string) => {
    const response = await api.get(`/rent/${id}`);
    return response.data;
  },

  createRentProperty: async (data: {
    address: string;
    ownerName: string;
    rentAmount: number;
    deposit: number;
    startDate: string;
    endDate?: string;
    status?: 'active' | 'completed' | 'cancelled';
    utilitiesIncluded?: boolean;
    utilitiesType?: 'included' | 'fixed' | 'variable';
    utilities?: Array<{ utilityTypeId?: string; name: string; amount: number }>;
    utilitiesAmount?: number;
    description?: string;
    tenants?: string[];
  }) => {
    const response = await api.post('/rent', data);
    return response.data;
  },

  updateRentProperty: async (id: string, data: {
    address?: string;
    ownerName?: string;
    rentAmount?: number;
    deposit?: number;
    startDate?: string;
    endDate?: string;
    status?: 'active' | 'completed' | 'cancelled';
    utilitiesIncluded?: boolean;
    utilitiesType?: 'included' | 'fixed' | 'variable';
    utilities?: Array<{ utilityTypeId?: string; name: string; amount: number }>;
    utilitiesAmount?: number;
    description?: string;
    tenants?: string[];
  }) => {
    const response = await api.put(`/rent/${id}`, data);
    return response.data;
  },

  deleteRentProperty: async (id: string) => {
    const response = await api.delete(`/rent/${id}`);
    return response.data;
  },

  // Rent Payments
  getRentPayments: async (params?: {
    propertyId?: string;
    status?: string;
    paymentType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/rent/payments', { params });
    return response.data;
  },

  getRentPayment: async (id: string) => {
    const response = await api.get(`/rent/payments/${id}`);
    return response.data;
  },

  createRentPayment: async (data: {
    propertyId: string;
    amount: number;
    paymentDate: string;
    status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
    paymentType: 'rent' | 'utilities' | 'deposit' | 'other';
    notes?: string;
    receiptFile?: string;
    receiptFileName?: string;
  }) => {
    const response = await api.post('/rent/payments', data);
    return response.data;
  },

  updateRentPayment: async (id: string, data: any) => {
    const response = await api.put(`/rent/payments/${id}`, data);
    return response.data;
  },

  deleteRentPayment: async (id: string) => {
    const response = await api.delete(`/rent/payments/${id}`);
    return response.data;
  },

  // Rent Statistics
  getRentStatistics: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/rent/statistics', { params });
    return response.data;
  },

  // Deposits
  getDeposits: async (params?: { status?: string; type?: string }) => {
    const response = await api.get('/deposits', { params });
    return response.data;
  },

  getDeposit: async (id: string) => {
    const response = await api.get(`/deposits/${id}`);
    return response.data;
  },

  createDeposit: async (data: any) => {
    const response = await api.post('/deposits', data);
    return response.data;
  },

  updateDeposit: async (id: string, data: any) => {
    const response = await api.put(`/deposits/${id}`, data);
    return response.data;
  },

  deleteDeposit: async (id: string) => {
    const response = await api.delete(`/deposits/${id}`);
    return response.data;
  },

  closeDeposit: async (id: string) => {
    const response = await api.patch(`/deposits/${id}/close`);
    return response.data;
  },

  renewDeposit: async (id: string) => {
    const response = await api.patch(`/deposits/${id}/renew`);
    return response.data;
  },

  // Banks (Банки)
  getBanks: async () => {
    const response = await api.get('/banks');
    return response.data;
  },

  getBank: async (id: string) => {
    const response = await api.get(`/banks/${id}`);
    return response.data;
  },

  createBank: async (data: {
    name: string;
    description?: string;
  }) => {
    const response = await api.post('/banks', data);
    return response.data;
  },

  updateBank: async (id: string, data: {
    name?: string;
    description?: string;
  }) => {
    const response = await api.put(`/banks/${id}`, data);
    return response.data;
  },

  deleteBank: async (id: string) => {
    const response = await api.delete(`/banks/${id}`);
    return response.data;
  },

  // Currencies (Валюты)
  getCurrencies: async () => {
    const response = await api.get('/currencies');
    return response.data;
  },

  getCurrency: async (id: string) => {
    const response = await api.get(`/currencies/${id}`);
    return response.data;
  },

  createCurrency: async (data: {
    code: string;
    name: string;
    symbol: string;
    exchangeRate?: number;
    isDefault?: boolean;
  }) => {
    const response = await api.post('/currencies', data);
    return response.data;
  },

  updateCurrency: async (id: string, data: {
    code?: string;
    name?: string;
    symbol?: string;
    exchangeRate?: number;
    isDefault?: boolean;
  }) => {
    const response = await api.put(`/currencies/${id}`, data);
    return response.data;
  },

  deleteCurrency: async (id: string) => {
    const response = await api.delete(`/currencies/${id}`);
    return response.data;
  },

  setDefaultCurrency: async (id: string) => {
    const response = await api.patch(`/currencies/${id}/set-default`);
    return response.data;
  },

  // Utility Types (Типы коммунальных услуг)
  getUtilityTypes: async () => {
    const response = await api.get('/utilitytypes');  // Изменено с /utility-types
    return response.data;
  },

  getUtilityType: async (id: string) => {
    const response = await api.get(`/utilitytypes/${id}`);  // Изменено
    return response.data;
  },

  createUtilityType: async (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
  }) => {
    const response = await api.post('/utilitytypes', data);  // Изменено
    return response.data;
  },

  updateUtilityType: async (id: string, data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
  }) => {
    const response = await api.put(`/utilitytypes/${id}`, data);  // Изменено
    return response.data;
  },

  deleteUtilityType: async (id: string) => {
    const response = await api.delete(`/utilitytypes/${id}`);  // Изменено
    return response.data;
  },
  // Deposit Transactions
  getDepositTransactions: async (params?: {
    depositId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/deposits/transactions', { params });
    return response.data;
  },

  getDepositTransaction: async (id: string) => {
    const response = await api.get(`/deposits/transactions/${id}`);
    return response.data;
  },

  createDepositTransaction: async (data: any) => {
    const response = await api.post('/deposits/transactions', data);
    return response.data;
  },

  updateDepositTransaction: async (id: string, data: any) => {
    const response = await api.put(`/deposits/transactions/${id}`, data);
    return response.data;
  },

  deleteDepositTransaction: async (id: string) => {
    const response = await api.delete(`/deposits/transactions/${id}`);
    return response.data;
  },

  getDepositStatistics: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/deposits/statistics', { params });
    return response.data;
  },

  // Payment Reminders (Ручные напоминания)
  getReminders: async () => {
    const response = await api.get('/reminders');
    return response.data;
  },

  createReminder: async (data: {
    title: string;
    amount: number;
    date: string;
    type: string;
    description?: string;
    isRecurring: boolean;
  }) => {
    const response = await api.post('/reminders', data);
    return response.data;
  },

  // Добавляем метод обновления
  updateReminder: async (id: string, data: any) => {
    const response = await api.put(`/reminders/${id}`, data);
    return response.data;
  },

  deleteReminder: async (id: string) => {
    const response = await api.delete(`/reminders/${id}`);
    return response.data;
  },

};

export default api;