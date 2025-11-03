/**
 * Вычисляет коэффициент сбережений
 */
export const calculateSavingsRate = (income: number, expenses: number): number => {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
};

/**
 * Вычисляет долговую нагрузку (отношение долговых платежей к доходу)
 */
export const calculateDebtToIncomeRatio = (debtPayments: number, income: number): number => {
  if (income <= 0) return 0;
  return (debtPayments / income) * 100;
};

/**
 * Вычисляет ликвидность (количество месяцев покрытия расходов)
 */
export const calculateLiquidityMonths = (currentBalance: number, monthlyExpenses: number): number => {
  if (monthlyExpenses <= 0) return 0;
  return currentBalance / monthlyExpenses;
};

/**
 * Вычисляет прогресс в процентах
 */
export const calculateProgress = (current: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
};

/**
 * Вычисляет месяцы до достижения цели
 */
export const calculateMonthsToGoal = (
  currentAmount: number, 
  targetAmount: number, 
  monthlyContribution: number
): number | string => {
  if (monthlyContribution <= 0) return "∞";
  if (currentAmount >= targetAmount) return 0;
  
  const remaining = targetAmount - currentAmount;
  return Math.ceil(remaining / monthlyContribution);
};

/**
 * Вычисляет сложный процент
 */
export const calculateCompoundInterest = (
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 12
): number => {
  return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * time);
};

/**
 * Вычисляет ежемесячный платеж по кредиту (аннуитет)
 */
export const calculateMonthlyPayment = (
  principal: number,
  annualRate: number,
  years: number
): number => {
  const monthlyRate = annualRate / 12 / 100;
  const numberOfPayments = years * 12;
  
  if (monthlyRate === 0) return principal / numberOfPayments;
  
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
         (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

/**
 * Вычисляет остаток по кредиту после n платежей
 */
export const calculateRemainingBalance = (
  principal: number,
  monthlyPayment: number,
  monthlyRate: number,
  paymentsMade: number
): number => {
  if (monthlyRate === 0) return principal - (monthlyPayment * paymentsMade);
  
  return principal * Math.pow(1 + monthlyRate, paymentsMade) - 
         monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
};

/**
 * Оценивает финансовое здоровье
 */
export const assessFinancialHealth = (metrics: {
  savingsRate: number;
  debtToIncomeRatio: number;
  liquidityMonths: number;
}): "excellent" | "good" | "fair" | "poor" => {
  const { savingsRate, debtToIncomeRatio, liquidityMonths } = metrics;
  
  const scores = [
    savingsRate >= 20 ? 3 : savingsRate >= 10 ? 2 : savingsRate >= 5 ? 1 : 0,
    debtToIncomeRatio <= 20 ? 3 : debtToIncomeRatio <= 35 ? 2 : debtToIncomeRatio <= 50 ? 1 : 0,
    liquidityMonths >= 6 ? 3 : liquidityMonths >= 3 ? 2 : liquidityMonths >= 1 ? 1 : 0
  ];
  
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  
  if (totalScore >= 8) return "excellent";
  if (totalScore >= 6) return "good";
  if (totalScore >= 4) return "fair";
  return "poor";
};