import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { useAppContext, useAppActions } from "../../contexts/AppContext";
import { cn } from "../../utils/cn";

export function NotificationCenter() {
  const { state } = useAppContext();
  const { removeNotification } = useAppActions();

  useEffect(() => {
    // Автоматически удаляем уведомления через 5 секунд
    state.notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
      
      return () => clearTimeout(timer);
    });
  }, [state.notifications, removeNotification]);

  if (state.notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {state.notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            "p-4 rounded-lg shadow-lg border-l-4 bg-white dark:bg-gray-800 transition-all duration-300",
            {
              "border-l-blue-500": notification.type === "info",
              "border-l-green-500": notification.type === "success",
              "border-l-yellow-500": notification.type === "warning",
              "border-l-red-500": notification.type === "error",
            }
          )}
        >
          <div className="flex items-start justify-between">
            <div className="pr-2">
              {notification.title && (
                <p className="text-sm font-medium text-foreground">
                  {notification.title}
                </p>
              )}
              <p className="text-sm text-foreground">
                {notification.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeNotification(notification.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(notification.timestamp).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>
      ))}
    </div>
  );
}