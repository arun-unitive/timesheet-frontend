import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

/** Minimal, dependency-free toast system. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, title, message) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((list) => [...list, { id, type, title, message }]);
      setTimeout(() => dismiss(id), 4200);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
      warning: (title, message) => push('warning', title, message),
      dismiss,
    }),
    [push, dismiss]
  );

  return <ToastContext.Provider value={{ ...api, toasts }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
