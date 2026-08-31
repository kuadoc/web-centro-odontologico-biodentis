"use client";

import { useCallback } from "react";
import { useAuth } from "./use-auth";

export function useApi() {
  const { token, logout } = useAuth();

  const request = useCallback(async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      logout();
      throw new Error("Sesión expirada");
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error en la solicitud");
    }

    return res.json();
  }, [token, logout]);

  const get = useCallback(<T>(url: string) => request<T>(url), [request]);
  const post = useCallback(<T>(url: string, body: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(body) }), [request]);
  const patch = useCallback(<T>(url: string, body: unknown) => request<T>(url, { method: "PATCH", body: JSON.stringify(body) }), [request]);
  const del = useCallback(<T>(url: string) => request<T>(url, { method: "DELETE" }), [request]);

  return { get, post, patch, del };
}
