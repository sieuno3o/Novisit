// src/components/Toast.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./Toast.scss";

type ToastItem = { id: string; message: string; duration: number };
type ToastCtx = { show: (message: string, duration?: number) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const api = useMemo<ToastCtx>(
    () => ({
      show: (message, duration = 2200) => {
        const id =
          (crypto as any)?.randomUUID?.() ?? String(Date.now() + Math.random());
        const item: ToastItem = { id, message, duration };
        setToasts((prev) => [...prev, item]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      },
    }),
    []
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="toast-container">
            {toasts.map((t) => (
              <div
                className="toast"
                key={t.id}
                role="status"
                aria-live="polite"
              >
                {t.message}
              </div>
            ))}
          </div>,
          document.body
        )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
