import React, { Suspense, useMemo, lazy, useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { Auth } from "./components/Auth";
import { ThemeProvider } from "./components/ThemeProvider";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { LogOut, Clock } from "lucide-react";
import { AppProvider, useAppContext, useAppActions } from "./contexts/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/common/LoadingFallback";
import { NotificationCenter } from "./components/common/NotificationCenter";
import { apiService } from "./services/api";
import type { User } from "./types";

// Локальные константы
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

// Lazy loading компонентов
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
  const [sessionExpired, setSessionExpired] = useState(false);

  // Проверяем сохраненного пользователя при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!apiService.isAuthenticated()) {
          setIsCheckingAuth(false);
          return;
        }

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
  }, []);

  // Функция для обработки истечения сессии
  const handleSessionExpiration = () => {
    console.log('Session expired - logging out user');
    
    // Показываем уведомление
    toast.error('Ваша сессия истекла', {
      description: 'Пожалуйста, войдите снова для продолжения работы',
      icon: <Clock className="w-5 h-5" />,
      duration: 5000,
    });
    
    // Устанавливаем флаг истечения сессии
    setSessionExpired(true);
    
    // Очищаем пользователя и перенаправляем на страницу входа
    setUser(null);
    setCurrentView('dashboard');
  };

  // Слушаем событие истечения сессии
  useEffect(() => {
    window.addEventListener('session-expired', handleSessionExpiration);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpiration);
    };
  }, []);

  // Автоматическая проверка активности каждые 5 минут
  useEffect(() => {
    if (!state.user) return;

    const checkActivity = setInterval(() => {
      // Проверяем, есть ли токен
      if (!apiService.isAuthenticated()) {
        window.dispatchEvent(new Event('session-expired'));
      }
    }, 1 * 60 * 1000); // 1 минуту

    return () => clearInterval(checkActivity);
  }, [state.user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setSessionExpired(false);
    
    // Показываем приветственное сообщение
    toast.success('Добро пожаловать!', {
      description: `Вы успешно вошли в систему`,
      duration: 3000
    });
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      toast.success('Вы успешно вышли из системы');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentView('dashboard');
      setUser(null);
      setSessionExpired(false);
    }
  };

  // Мемоизируем компоненты
  const renderContent = useMemo(() => {
    const currentRoute = state.currentView || 'dashboard';
    
    const getComponent = () => {
      switch (currentRoute) {
        case 'dashboard':
          return <Dashboard />;
        case 'quick-expenses':
          return <QuickExpenseAdd />;
        case 'calendar':
          return <PaymentCalendar />;
        case 'profile':
          return <Profile />;
        case 'references':
          return <References />;
        case 'income':
          return <Income />;
        case 'credits':
          return <Credits />;
        case 'rent':
          return <Rent />;
        case 'utilities':
          return <Utilities />;
        case 'monthly':
          return <MonthlyExpenses />;
        case 'deposits':
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

  const pageTitle = PAGE_TITLES[state.currentView as keyof typeof PAGE_TITLES] || "Главная";
  
  const pageDescription = useMemo(() => {
    const currentView = state.currentView as keyof typeof PAGE_DESCRIPTIONS;
    const description = PAGE_DESCRIPTIONS[currentView];
    
    if (typeof description === "function") {
      return state.user ? description(state.user.name) : "Добро пожаловать в систему учёта бюджета";
    }
    
    return description || "Добро пожаловать в систему учёта бюджета";
  }, [state.currentView, state.user]);

  // Показываем загрузку пока проверяем авторизацию
  if (isCheckingAuth) {
    return <LoadingFallback type="spinner" />;
  }

  // Если пользователь не авторизован, показываем форму входа
  if (!state.user) {
    return (
      <Auth 
        onLogin={handleLogin} 
        sessionExpired={sessionExpired}
      />
    );
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