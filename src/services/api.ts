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

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
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
          email: response.data.data.login,
          name: response.data.data.fullName || response.data.data.firstName,
          id: response.data.data.id
        };
      }
      return null;
    } catch (error) {
      // If token is invalid, clear it
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
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

  // Credits
  getCredits: async () => {
    const response = await api.get('/credits');
    return response.data;
  },

  createCredit: async (data: any) => {
    const response = await api.post('/credits', data);
    return response.data;
  },

  updateCredit: async (id: string, data: any) => {
    const response = await api.put(`/credits/${id}`, data);
    return response.data;
  },

  deleteCredit: async (id: string) => {
    const response = await api.delete(`/credits/${id}`);
    return response.data;
  },

  // Deposits
  getDeposits: async () => {
    const response = await api.get('/deposits');
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

  // Monthly Expenses
  getMonthlyExpenses: async () => {
    const response = await api.get('/monthly-expenses');
    return response.data;
  },

  createMonthlyExpense: async (data: any) => {
    const response = await api.post('/monthly-expenses', data);
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
};

export default api;