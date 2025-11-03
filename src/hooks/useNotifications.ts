import { useCallback } from "react";
import { useAppActions } from "../contexts/AppContext";

export function useNotifications() {
  const { addNotification } = useAppActions();

  const showSuccess = useCallback((message: string) => {
    addNotification({
      message,
      type: "success"
    });
  }, [addNotification]);

  const showError = useCallback((message: string) => {
    addNotification({
      message,
      type: "error"
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string) => {
    addNotification({
      message,
      type: "warning"
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string) => {
    addNotification({
      message,
      type: "info"
    });
  }, [addNotification]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}