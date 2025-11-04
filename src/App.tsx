import React, { Suspense, useMemo, lazy, useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { Auth } from "./components/Auth";
import { ThemeProvider } from "./components/ThemeProvider";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { LogOut } from "lucide-react";
import { AppProvider, useAppContext, useAppActions } from "./contexts/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/common/LoadingFallback";
import { NotificationCenter } from "./components/common/NotificationCenter";
import { apiService } from "./services/api";
import type { User } from "./types";

// Локальные константы для избежания проблем с импортом
const ROUTES = {
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

const PAGE_TITLES = {
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

const PAGE_DESCRIPTIONS = {
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

// Lazy loading компонентов для оптимизации
const Dashboard = lazy(() => import("./components/Dashboard"));
const PaymentCalendar = lazy(() => import("./components/PaymentCalendar"));
const QuickExpenseAdd = lazy(() => import("./components/QuickExpenseAdd"));
const References = lazy(() => import("./components/References"));
const Profile = lazy(() => import("./components/Profile"));
const Income = lazy(() => import("./components/Income"));
const Credits = lazy(() => import("./components/Credits"));
const Rent = lazy(() => import("./components/Rent"));
const Utilities = lazy(() => import("./components/Utilities"));
const MonthlyExpenses = lazy(() => import("./components/MonthlyExpenses"));
const Deposits = lazy(() => import("./components/Deposits"));

function AppContent() {
  const { state } = useAppContext();
  const { setUser, setCurrentView } = useAppActions();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Проверяем сохраненного пользователя при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Проверяем есть ли токен
        if (!apiService.isAuthenticated()) {
          setIsCheckingAuth(false);
          return;
        }

        // Если есть токен, но нет пользователя в state, загружаем данные
        if (!state.user) {
          const savedUser = await apiService.getSavedUser();
          if (savedUser) {
            setUser(savedUser);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []); // Запускаем только один раз при монтировании

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentView(ROUTES.DASHBOARD);
      setUser(null);
    }
  };

  // Мемоизируем компоненты для предотвращения излишних ре-рендеров
  const renderContent = useMemo(() => {
    const currentRoute = state.currentView || ROUTES.DASHBOARD;
    
    const getComponent = () => {
      switch (currentRoute) {
        case ROUTES.DASHBOARD:
          return <Dashboard />;
        case ROUTES.QUICK_EXPENSES:
          return <QuickExpenseAdd />;
        case ROUTES.CALENDAR:
          return <PaymentCalendar />;
        case ROUTES.PROFILE:
          return <Profile />;
        case ROUTES.REFERENCES:
          return <References />;
        case ROUTES.INCOME:
          return <Income />;
        case ROUTES.CREDITS:
          return <Credits />;
        case ROUTES.RENT:
          return <Rent />;
        case ROUTES.UTILITIES:
          return <Utilities />;
        case ROUTES.MONTHLY:
          return <MonthlyExpenses />;
        case ROUTES.DEPOSITS:
          return <Deposits />;
        default:
          return <Dashboard />;
      }
    };

    return (
      <Suspense fallback={<LoadingFallback type="dashboard" />}>
        <ErrorBoundary>
          {getComponent()}
        </ErrorBoundary>
      </Suspense>
    );
  }, [state.currentView]);

  const pageTitle = PAGE_TITLES[state.currentView as keyof typeof PAGE_TITLES] || PAGE_TITLES[ROUTES.DASHBOARD] || "Главная";
  
  const pageDescription = useMemo(() => {
    const description = PAGE_DESCRIPTIONS[state.currentView as keyof typeof PAGE_DESCRIPTIONS];
    return typeof description === "function" && state.user ? description(state.user.name) : description || "Добро пожаловать в систему учёта бюджета";
  }, [state.currentView, state.user]);

  // Показываем загрузку пока проверяем авторизацию
  if (isCheckingAuth) {
    return <LoadingFallback type="page" />;
  }

  // Если пользователь не авторизован, показываем форму входа
  if (!state.user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar currentView={state.currentView} onViewChange={setCurrentView} />
        <SidebarInset className="flex-1">
          <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between px-6">
              <div>
                <h1 className="text-xl font-semibold">{pageTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  {pageDescription}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{state.user?.email}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/20 overflow-auto">
            {renderContent}
          </main>
        </SidebarInset>
      </div>
      <NotificationCenter />
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="budget-ui-theme">
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}