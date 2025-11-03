// Константы приложения
export const ROUTES = {
  DASHBOARD: "dashboard",
  QUICK_EXPENSES: "quick-expenses", 
  CALENDAR: "calendar",
  PROFILE: "profile",
  REFERENCES: "references",
  INCOME: "income",
  CREDITS: "credits",
  RENT: "rent",
  UTILITIES: "utilities",
  MONTHLY: "monthly",
  DEPOSITS: "deposits",
} as const;

export const PAGE_TITLES = {
  [ROUTES.DASHBOARD]: "Главная",
  [ROUTES.QUICK_EXPENSES]: "Быстрые расходы",
  [ROUTES.CALENDAR]: "Календарь платежей",
  [ROUTES.PROFILE]: "Профиль",
  [ROUTES.REFERENCES]: "Справочники",
  [ROUTES.INCOME]: "Доходы",
  [ROUTES.CREDITS]: "Кредиты и рассрочки",
  [ROUTES.RENT]: "Аренда жилья",
  [ROUTES.UTILITIES]: "Коммунальные платежи",
  [ROUTES.MONTHLY]: "Ежемесячные траты",
  [ROUTES.DEPOSITS]: "Депозиты",
} as const;

export const PAGE_DESCRIPTIONS = {
  [ROUTES.DASHBOARD]: (name: string) => `Добро пожаловать, ${name}!`,
  [ROUTES.QUICK_EXPENSES]: "Быстрое добавление и учёт расходов",
  [ROUTES.CALENDAR]: "Планирование платежей и напоминания",
  [ROUTES.PROFILE]: "Настройки профиля и персональные данные",
  [ROUTES.REFERENCES]: "Категории бюджета, валюта и справочная информация",
  [ROUTES.INCOME]: "Учёт доходов, постановка целей и аналитика поступлений",
  [ROUTES.CREDITS]: "Учёт кредитов, рассрочек и графиков платежей",
  [ROUTES.RENT]: "Управление арендой жилья и платежами",
  [ROUTES.UTILITIES]: "Учет показаний счетчиков и коммунальных платежей",
  [ROUTES.MONTHLY]: "Планирование и контроль ежемесячных трат",
  [ROUTES.DEPOSITS]: "Управление депозитами, накопления и расходные портфели",
} as const;

export const CURRENCY = {
  SYMBOL: "₸",
  CODE: "KZT",
  NAME: "Казахстанский тенге",
} as const;

export const COLORS = {
  TAILWIND: [
    "bg-blue-500", "bg-green-500", "bg-purple-500", 
    "bg-orange-500", "bg-pink-500", "bg-red-500",
    "bg-yellow-500", "bg-indigo-500", "bg-teal-500",
    "bg-gray-500", "bg-slate-500", "bg-cyan-500"
  ],
  CHART: {
    PRIMARY: "#10b981",
    SECONDARY: "#f59e0b", 
    ACCENT: "#3b82f6",
    DANGER: "#ef4444",
    WARNING: "#f59e0b",
    SUCCESS: "#10b981",
  }
} as const;

export const GRADIENTS = {
  GREEN: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800",
  BLUE: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800",
  ORANGE: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800",
  PURPLE: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800",
  RED: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800",
  YELLOW: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];