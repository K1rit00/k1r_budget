import { CURRENCY } from "../constants";

/**
 * Форматирует число как валюту в казахских тенге
 */
export const formatCurrency = (amount: number, options?: {
  showSymbol?: boolean;
  locale?: string;
}): string => {
  const { showSymbol = true, locale = "kk-KZ" } = options || {};
  
  const formatted = amount.toLocaleString(locale);
  return showSymbol ? `${formatted} ${CURRENCY.SYMBOL}` : formatted;
};

/**
 * Форматирует дату в локальном формате
 */
export const formatDate = (date: Date | string, options?: {
  locale?: string;
  format?: "short" | "long" | "medium";
}): string => {
  const { locale = "ru-RU", format = "short" } = options || {};
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  switch (format) {
    case "long":
      return dateObj.toLocaleDateString(locale, {
        year: "numeric",
        month: "long", 
        day: "numeric"
      });
    case "medium":
      return dateObj.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    default:
      return dateObj.toLocaleDateString(locale);
  }
};

/**
 * Форматирует процент
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Сокращает большие числа (1K, 1M, 1B)
 */
export const formatShortNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + "K";
  }
  return num.toString();
};

/**
 * Форматирует месяцы до цели
 */
export const formatMonthsToGoal = (months: number | string): string => {
  if (typeof months === "string") return months;
  return months > 0 ? `${months} мес.` : "Достигнуто";
};

/**
 * Парсит строку валюты в число
 */
export const parseCurrency = (currencyString: string): number => {
  return parseFloat(currencyString.replace(/[^\d.-]/g, "")) || 0;
};

/**
 * Валидирует email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Генерирует уникальный ID
 */
export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};