import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { useAppContext } from "../contexts/AppContext";

// UI Компонент лоадера
export const FullScreenLoaderUI: React.FC<{ message?: string; subMessage?: string }> = ({ 
  message = "Обработка данных...", 
  subMessage = "Пожалуйста, подождите" 
}) => {
  // Состояние для монтирования портала (нужно для SSR безопасности, хотя здесь SPA)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  // Рендерим через Portal прямо в body, поверх всех слоев приложения
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-background/80 backdrop-blur-sm flex items-center justify-center transition-all duration-200 touch-none select-none">
      {/* Блокируем клики прозрачным слоем еще раз для надежности */}
      <div className="absolute inset-0 z-[-1]" onClick={(e) => e.stopPropagation()} />
      
      <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-2xl border animate-in fade-in zoom-in duration-200">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-foreground">
            {message}
          </p>
          <p className="text-xs text-muted-foreground">
            {subMessage}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Подключенный к состоянию компонент
export const GlobalLoader: React.FC = () => {
  const { state } = useAppContext();

  if (!state.globalLoading) return null;

  return <FullScreenLoaderUI />;
};