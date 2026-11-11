"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

type Toast = { id: string; message: string; type: "success" | "error" };
const ToastContext = createContext<((message: string, type?: Toast["type"]) => void) | null>(null);

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.type === "error" ? 10000 : 6000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, dismiss]);
  const Icon = toast.type === "error" ? AlertCircle : CheckCircle;
  return (
    <div role={toast.type === "error" ? "alert" : "status"} className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-background p-4 text-foreground shadow-lg">
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${toast.type === "error" ? "text-destructive" : "text-primary"}`} />
      <p className="min-w-0 flex-1 text-sm">{toast.message}</p>
      <Button variant="ghost" size="icon-sm" aria-label="Cerrar notificación" onPress={() => dismiss(toast.id)}><X aria-hidden="true" /></Button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast["type"] = "success") => {
    setToasts((previous) => [...previous.slice(-2), { id: crypto.randomUUID(), message, type }]);
  }, []);
  const dismiss = useCallback((id: string) => setToasts((previous) => previous.filter((toast) => toast.id !== id)), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-label="Notificaciones" className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:left-auto sm:w-96">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast requiere ToastProvider");
  return show;
}
