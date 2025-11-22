import React, { Suspense, useMemo, lazy, useEffect, useState, useRef } from "react";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { Auth } from "./components/Auth";
import { ThemeProvider } from "./components/ThemeProvider";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { LogOut, Clock, BellRing } from "lucide-react"; // Добавили иконку BellRing
import { AppProvider, useAppContext, useAppActions } from "./contexts/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/common/LoadingFallback";
import { NotificationCenter } from "./components/common/NotificationCenter";
import api, { apiService } from "./services/api"; 
import { GlobalLoader, FullScreenLoaderUI } from "./services/GlobalLoader";
import type { User } from "./types";

// ... (Оставляем константы ROUTES, PAGE_TITLES, PAGE_DESCRIPTIONS без изменений) ...
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
  const { setUser, setCurrentView, setGlobalLoading } = useAppActions();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const requestCountRef = useRef(0);

  // --- НОВАЯ ФУНКЦИЯ: Проверка напоминаний на сегодня ---
  const checkTodayReminders = async () => {
    try {
      // Параллельно запрашиваем данные (тихо, без блокировки UI если возможно)
      const [creditsRes, rentsRes, remindersRes] = await Promise.all([
        apiService.getCredits({ status: 'active' }),
        apiService.getRentProperties({ status: 'active' }),
        apiService.getReminders()
      ]);

      const credits = creditsRes.data || [];
      const rents = rentsRes.data || [];
      const manualReminders = remindersRes.data || [];

      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      let todayCount = 0;

      // 1. Проверка кредитов (упрощенная логика календаря)
      credits.forEach((credit: any) => {
        // Если дата платежа больше кол-ва дней в месяце, то платеж в последний день
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const paymentDay = Math.min(credit.monthlyPaymentDate, daysInMonth);
        
        const startDate = new Date(credit.startDate);
        startDate.setHours(0,0,0,0);
        
        if (paymentDay === currentDay && today >= startDate) {
          todayCount++;
        }
      });

      // 2. Проверка аренды (обычно 1 число)
      rents.forEach((rent: any) => {
        if (currentDay === 1) {
           const startDate = new Date(rent.startDate);
           startDate.setHours(0,0,0,0);
           // Проверяем активность
           if (today >= startDate && (!rent.endDate || new Date(rent.endDate) >= today)) {
             todayCount++;
           }
        }
      });

      // 3. Ручные напоминания
      manualReminders.forEach((reminder: any) => {
        const remDate = new Date(reminder.date);
        
        if (reminder.isRecurring) {
           const targetDay = reminder.dayOfMonth || remDate.getDate();
           // Коррекция на конец месяца
           const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
           const actualDay = Math.min(targetDay, daysInMonth);
           
           if (actualDay === currentDay) todayCount++;
        } else {
           if (remDate.getDate() === currentDay && 
               remDate.getMonth() === currentMonth && 
               remDate.getFullYear() === currentYear) {
             todayCount++;
           }
        }
      });

      // Если есть платежи — отправляем уведомление
      if (todayCount > 0) {
        toast(`На сегодня запланировано платежей: ${todayCount}`, {
          description: "Не забудьте проверить календарь платежей",
          icon: <BellRing className="w-5 h-5 text-blue-500" />,
          duration: 8000, // Показываем подольше
          action: {
            label: "Смотреть",
            onClick: () => setCurrentView(ROUTES.CALENDAR)
          }
        });
      }

    } catch (error) {
      console.error("Ошибка при проверке ежедневных напоминаний", error);
    }
  };
  // ------------------------------------------------------

  // 1. LOGIC: Интерсепторы
  useEffect(() => {
    const reqInterceptor = api.interceptors.request.use(
      (config) => {
        requestCountRef.current++;
        setGlobalLoading(true);
        return config;
      },
      (error) => {
        requestCountRef.current--;
        if (requestCountRef.current <= 0) {
          requestCountRef.current = 0;
          setGlobalLoading(false);
        }
        return Promise.reject(error);
      }
    );

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        requestCountRef.current--;
        if (requestCountRef.current <= 0) {
          requestCountRef.current = 0;
          setGlobalLoading(false);
        }
        return response;
      },
      (error) => {
        requestCountRef.current--;
        if (requestCountRef.current <= 0) {
          requestCountRef.current = 0;
          setGlobalLoading(false);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, [setGlobalLoading]);

  // 2. LOGIC: Страховка от вечной загрузки
  useEffect(() => {
    let safetyTimer: NodeJS.Timeout;

    if (state.globalLoading) {
      safetyTimer = setTimeout(() => {
        if (requestCountRef.current === 0) {
          setGlobalLoading(false);
        }
      }, 500);
    }

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, [state.globalLoading, state.currentView, setGlobalLoading]);

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
            // ВЫЗОВ ПРОВЕРКИ НАПОМИНАНИЙ (при перезагрузке страницы)
            checkTodayReminders(); 
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

  // Слушаем событие истечения сессии
  useEffect(() => {
    const handleSessionExpiration = () => {
      console.log('Session expired - logging out user');
      toast.error('Ваша сессия истекла', {
        description: 'Пожалуйста, войдите снова для продолжения работы',
        icon: <Clock className="w-5 h-5" />,
        duration: 5000,
      });
      setSessionExpired(true);
      setUser(null);
      setCurrentView('dashboard');
    };

    window.addEventListener('session-expired', handleSessionExpiration);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpiration);
    };
  }, []);

  // Автоматическая проверка активности
  useEffect(() => {
    if (!state.user) return;
    const checkActivity = setInterval(() => {
      if (!apiService.isAuthenticated()) {
        window.dispatchEvent(new Event('session-expired'));
      }
    }, 1 * 60 * 1000);
    return () => clearInterval(checkActivity);
  }, [state.user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setSessionExpired(false);
    
    toast.success('Добро пожаловать!', {
      description: `Вы успешно вошли в систему`,
      duration: 3000
    });

    // ВЫЗОВ ПРОВЕРКИ НАПОМИНАНИЙ (при явном входе через форму)
    checkTodayReminders();
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

  const renderContent = useMemo(() => {
    // ... (код renderContent без изменений) ...
    const currentRoute = state.currentView || 'dashboard';
    
    const getComponent = () => {
      switch (currentRoute) {
        case 'dashboard': return <Dashboard />;
        case 'quick-expenses': return <QuickExpenseAdd />;
        case 'calendar': return <PaymentCalendar />;
        case 'profile': return <Profile />;
        case 'references': return <References />;
        case 'income': return <Income />;
        case 'credits': return <Credits />;
        case 'rent': return <Rent />;
        case 'utilities': return <Utilities />;
        case 'monthly': return <MonthlyExpenses />;
        case 'deposits': return <Deposits />;
        default: return <Dashboard />;
      }
    };

    return (
      <Suspense fallback={<FullScreenLoaderUI message="Загрузка раздела..." />}>
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

  if (isCheckingAuth) {
    return <LoadingFallback type="spinner" />;
  }

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
      <GlobalLoader />
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