"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { Role } from "@biodentis/shared-types";
import type { z } from "zod";
import type { RegisterSchema } from "@biodentis/shared-validators";
import { useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch, getAccessToken, logoutSession, saveAccessToken, SessionExpiredError, SESSION_TOKEN_EVENT } from "@/lib/client-session";

interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionError: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => void;
}

type RegisterData = z.infer<typeof RegisterSchema>;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    sessionError: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        // El rol almacenado en el navegador no es una fuente de autorización.
        const response = await authenticatedFetch("/api/users/me", { cache: "no-store" }, false);
        if (!response.ok) {
          throw new Error("No se pudo verificar la sesión. Intenta nuevamente.");
        }
        const user: User & { isActive: boolean } = await response.json();
        if (!user.isActive || cancelled) return;
        localStorage.setItem("user", JSON.stringify(user));
        queryClient.clear();
        setState({ user, token: getAccessToken(), isLoading: false, sessionError: null });
      } catch (error) {
        if (!cancelled && !(error instanceof SessionExpiredError)) {
          setState((prev) => ({ ...prev, sessionError: "No se pudo verificar la sesión. Revisa tu conexión e intenta nuevamente." }));
        }
      } finally {
        if (!cancelled) setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
    void restoreSession();
    return () => { cancelled = true; };
  }, [queryClient, restoreAttempt]);

  useEffect(() => {
    function syncToken() {
      const token = getAccessToken();
      setState((prev) => ({ ...prev, token, ...(token ? {} : { user: null }) }));
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === "accessToken" || event.key === null) syncToken();
    }
    window.addEventListener(SESSION_TOKEN_EVENT, syncToken);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(SESSION_TOKEN_EVENT, syncToken);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const retrySession = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, sessionError: null }));
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al iniciar sesión");
    }

    const data: { user: User; accessToken: string } = await res.json();
    saveAccessToken(data.accessToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    queryClient.clear();
    setState({ user: data.user, token: data.accessToken, isLoading: false, sessionError: null });
    return data.user;
  }, [queryClient]);

  const register = useCallback(async (data: RegisterData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al registrarse");
    }

    const result = await res.json();
    saveAccessToken(result.accessToken);
    localStorage.setItem("user", JSON.stringify(result.user));
    queryClient.clear();
    setState({ user: result.user, token: result.accessToken, isLoading: false, sessionError: null });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } catch {
      // Silenciar errores de red — limpiar local igualmente
    }
    queryClient.clear();
    setState({ user: null, token: null, isLoading: false, sessionError: null });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, retrySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
