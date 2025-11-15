// Глобальные типы приложения
export interface User {
  email: string;
  name: string;
  id?: string;
  avatar?: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface IncomeCategory extends Category {}

export interface ExpenseCategory extends Category {
  isDefault: boolean;
}

export interface UtilityType extends Category {
  unit: string;
}

export interface Account {
  id: string;
  name: string;
  type: "cash" | "card" | "bank";
  balance: number;
  description?: string;
  isActive: boolean;
}

// Типы для доходов
export interface Income {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  date: string;
  source: string;
  description?: string;
  isRecurring: boolean;
  type: string;
  recurringPeriod?: "weekly" | "monthly" | "quarterly" | "yearly";
  tags?: string[];
  accountId?: string;
}

export interface IncomeGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category?: string;
  description?: string;
  isActive: boolean;
}

export interface ChartDataPoint {
  month: string;
  доходы: number;
  расходы: number;
  экономия: number;
  кредиты?: number;
}

export interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface PaymentSchedule {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: "credit" | "rent" | "utility" | "other";
  urgent: boolean;
}

// Типы для кредитов
export interface Credit {
  id: string;
  name: string;
  bank: string;
  amount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  endDate: string;
  type: "credit" | "loan" | "installment";
  status: "active" | "paid" | "overdue";
  description?: string;
}

export interface CreditPayment {
  id: string;
  creditId: string;
  amount: number;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  status: "pending" | "paid" | "overdue";
}

// Типы для аренды
export interface RentProperty {
  id: string;
  address: string;
  ownerName: string;
  rentAmount: number;
  deposit: number;
  startDate: string;
  endDate?: string;
  status: "active" | "ended";
  utilitiesIncluded: boolean;
  description?: string;
  tenants: RentTenant[];
  utilitiesAmount?: number; // Фиксированная сумма коммунальных платежей
  utilitiesType?: "included" | "fixed" | "variable"; // Тип коммунальных платежей
  utilities?: UtilityItem[]; // Список коммунальных услуг с фиксированной суммой
}

export interface UtilityItem {
  id: string;
  name: string;
  amount: number;
}

export interface RentTenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  sharePercentage: number;
  monthlyAmount: number;
}

export interface RentPayment {
  id: string;
  propertyId: string;
  tenantId?: string;
  amount: number;
  paymentDate: string;
  status: "pending" | "paid" | "confirmed" | "overdue";
  confirmationDate?: string;
  notes?: string;
  receiptFile?: string; // Base64 encoded file
  receiptFileName?: string;
  paymentType?: "rent" | "utilities"; // Тип платежа: аренда или коммуналка
}

// Типы для коммунальных услуг
export interface Utility {
  id: string;
  name: string;
  type: "electricity" | "gas" | "water" | "heating" | "internet" | "other";
  provider: string;
  accountNumber: string;
  tariff: number;
  unit: string;
  isMetered: boolean;
  meterNumber?: string;
}

export interface UtilityReading {
  id: string;
  utilityId: string;
  currentReading: number;
  previousReading: number;
  readingDate: string;
  consumption: number;
  amount: number;
  status: "pending" | "paid";
}

// Типы для ежемесячных трат
export interface MonthlyExpense {
  id: string;
  categoryId: string;
  name: string;
  plannedAmount: number;
  actualAmount?: number;
  dueDate: string;
  isRecurring: boolean;
  status: "planned" | "paid" | "overdue";
  description?: string;
}

export interface MonthlyBudget {
  id: string;
  month: string;
  year: number;
  totalPlanned: number;
  totalActual: number;
  expenses: MonthlyExpense[];
}

// Типы для депозитов
export interface Deposit {
  id: string;
  title: string;
  bankName?: string;
  accountNumber?: string;
  amount: number;
  currentBalance: number;
  interestRate?: number;  
  startDate?: string;    
  endDate?: string;       
  type: "fixed" | "savings" | "investment" | "spending";  
  autoRenewal?: boolean;
  isActive: boolean;
  status?: "active" | "matured" | "closed";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepositTransaction {
  id: string;
  depositId: string;
  type: "deposit" | "withdrawal" | "interest";
  amount: number;
  transactionDate: string;
  description?: string;
  incomeId?: string;  // Добавлено для исправления ошибки
}

export interface IncomeStream {
  source: string;
  amount: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

export interface FormError {
  field: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: FormError[];
}

// Тип для компонентов форм
export interface FormProps<T = any> {
  initialData?: T;
  onSubmit: (data: T) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  errors?: FormError[];
}

// Утилитарные типы
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;