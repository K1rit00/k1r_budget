import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import type { User } from "../types";

// Константы для избежания циркулярных зависимостей
const ROUTES_CONSTANTS = {
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

// Типы состояния
export interface AppState {
  user: User | null;
  currentView: string;
  loading: boolean;
  error: string | null;
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  title?: string;
}

// Типы действий
export type AppAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_CURRENT_VIEW"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "ADD_NOTIFICATION"; payload: AppNotification }
  | { type: "REMOVE_NOTIFICATION"; payload: string }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "RESET_STATE" };

// Начальное состояние
const initialState: AppState = {
  user: null,
  currentView: ROUTES_CONSTANTS.DASHBOARD,
  loading: false,
  error: null,
  notifications: []
};

// Редьюсер
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    
    case "SET_CURRENT_VIEW":
      return { ...state, currentView: action.payload };
    
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    
    case "SET_ERROR":
      return { ...state, error: action.payload };
    
    case "ADD_NOTIFICATION":
      return { 
        ...state, 
        notifications: [...state.notifications, action.payload] 
      };
    
    case "REMOVE_NOTIFICATION":
      return { 
        ...state, 
        notifications: state.notifications.filter(n => n.id !== action.payload) 
      };
    
    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: [] };
    
    case "RESET_STATE":
      return initialState;
    
    default:
      return state;
  }
}

// Контекст
const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
} | null>(null);

// Провайдер
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Хук для использования контекста
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

// Хелперы для действий
export function useAppActions() {
  const { dispatch } = useAppContext();

  return {
    setUser: (user: User | null) => dispatch({ type: "SET_USER", payload: user }),
    setCurrentView: (view: string) => dispatch({ type: "SET_CURRENT_VIEW", payload: view }),
    setLoading: (loading: boolean) => dispatch({ type: "SET_LOADING", payload: loading }),
    setError: (error: string | null) => dispatch({ type: "SET_ERROR", payload: error }),
    addNotification: (notification: Omit<AppNotification, "id" | "timestamp">) => {
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date().toISOString()
        }
      });
    },
    removeNotification: (id: string) => dispatch({ type: "REMOVE_NOTIFICATION", payload: id }),
    clearNotifications: () => dispatch({ type: "CLEAR_NOTIFICATIONS" }),
    resetState: () => dispatch({ type: "RESET_STATE" })
  };
}