"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import styles from "@/styles/App.module.css";

type ToastTone = "success" | "info";

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => Promise<void> | void;
}

interface ToastContextValue {
  showToast: (message: Omit<ToastMessage, "id">) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<number[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: Omit<ToastMessage, "id">) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...message, id }]);
    window.setTimeout(() => removeToast(id), 2600);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.toastViewport} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${toast.tone === "success" ? styles.toastSuccess : styles.toastInfo}`}
          >
            <CheckCircle2 className={styles.iconSm} />
            <div className={styles.toastBody}>
              <strong>{toast.title}</strong>
              {toast.description && <span>{toast.description}</span>}
            </div>
            {toast.actionLabel && toast.onAction && (
              <button type="button" className={styles.toastAction} disabled={pendingActions.includes(toast.id)} onClick={async () => { if (pendingActions.includes(toast.id)) return; setPendingActions((current) => [...current, toast.id]); try { await toast.onAction?.(); removeToast(toast.id); } catch { /* 실패 안내는 action callback에서 표시하고 현재 Toast는 유지한다. */ } finally { setPendingActions((current) => current.filter((id) => id !== toast.id)); } }}>
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              className={styles.toastClose}
              aria-label="토스트 닫기"
              onClick={() => removeToast(toast.id)}
            >
              <X className={styles.iconXs} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
