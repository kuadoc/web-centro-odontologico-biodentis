"use client";

import { useCallback } from "react";

export function useApi() {
  const getToken = useCallback(() => localStorage.getItem("accessToken"), []);

  const request = useCallback(async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Sesión expirada");
    }

    if (!res.ok) {
      let errMsg = "Error en la solicitud";
      try {
        const err = await res.json();
        errMsg = err.error || err.message || `HTTP ${res.status}`;
      } catch {
        errMsg = `HTTP ${res.status} ${res.statusText}`;
      }
      throw new Error(errMsg);
    }

    return res.json();
  }, [getToken]);

  const get = useCallback(<T>(url: string) => request<T>(url), [request]);
  const post = useCallback(<T>(url: string, body: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(body) }), [request]);
  const patch = useCallback(<T>(url: string, body: unknown) => request<T>(url, { method: "PATCH", body: JSON.stringify(body) }), [request]);
  const del = useCallback(<T>(url: string) => request<T>(url, { method: "DELETE" }), [request]);

  return { get, post, patch, del };
}
