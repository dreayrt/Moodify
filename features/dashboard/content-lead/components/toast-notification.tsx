"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { ToastMessage } from "../types";

type ToastNotificationProps = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
};

export function ToastNotification({ toasts, onDismiss }: ToastNotificationProps) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        onDismiss(toast.id);
      }, 4000)
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";

        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-[18px] border border-white/12 bg-[#14161d]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          >
            <div className="flex items-center gap-3">
              {isSuccess && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              {isError && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
              {(isWarning || (!isSuccess && !isError)) && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ff7a2c]/15 text-[#ffb488]">
                  <Info className="h-4 w-4" />
                </div>
              )}
              <p className="text-[13px] font-medium text-white/90 leading-snug">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white transition"
              aria-label="Close toast"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
