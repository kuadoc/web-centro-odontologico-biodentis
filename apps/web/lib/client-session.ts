"use client";

export const SESSION_TOKEN_EVENT = "biodentis:session-token";
const SESSION_LOCK = "biodentis:session-renewal";
let renewal: Promise<string> | null = null;
let sessionVersion = 0;

export class SessionExpiredError extends Error {
  constructor() {
    super("La sesión ha finalizado. Inicia sesión nuevamente.");
    this.name = "SessionExpiredError";
  }
}

export function getAccessToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem("accessToken");
}

export function saveAccessToken(token: string): void {
  sessionVersion++;
  localStorage.setItem("accessToken", token);
  window.dispatchEvent(new Event(SESSION_TOKEN_EVENT));
}

export function clearClientSession(): void {
  sessionVersion++;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event(SESSION_TOKEN_EVENT));
}

async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  // Web Locks coordina pestañas del mismo origen; renewal coordina la pestaña actual.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(SESSION_LOCK, action);
  }
  return action();
}

export function refreshAccessToken(previousToken: string | null): Promise<string> {
  if (renewal) return renewal;
  const version = sessionVersion;
  renewal = withSessionLock(async () => {
    const currentToken = getAccessToken();
    // Otra petición o pestaña pudo completar la renovación mientras esperábamos.
    if (currentToken && currentToken !== previousToken) return currentToken;
    if (version !== sessionVersion) throw new Error("La sesión cambió durante la solicitud.");
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (version !== sessionVersion) throw new Error("La sesión cambió durante la solicitud.");
    if ([401, 403, 404].includes(response.status)) throw new SessionExpiredError();
    if (!response.ok) throw new Error("No se pudo renovar la sesión. Intenta nuevamente.");
    const data: unknown = await response.json();
    if (
      typeof data !== "object" || data === null ||
      !("accessToken" in data) || typeof data.accessToken !== "string" || !data.accessToken
    ) {
      throw new Error("No se pudo renovar la sesión. Intenta nuevamente.");
    }
    // Una respuesta tardía nunca debe restaurar una sesión cerrada o reemplazada.
    if (version !== sessionVersion) throw new Error("La sesión cambió durante la solicitud.");
    saveAccessToken(data.accessToken);
    return data.accessToken;
  }).finally(() => { renewal = null; });
  return renewal;
}

export async function logoutSession(): Promise<void> {
  const pendingRenewal = renewal;
  clearClientSession();
  await pendingRenewal?.catch(() => {});
  // Espera la rotación para revocar la cookie más reciente, también entre pestañas.
  await withSessionLock(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      clearClientSession();
    }
  });
}

/** Renueva y reintenta una vez, sin recargar la página ni desmontar formularios. */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  redirectOnExpiry = true,
): Promise<Response> {
  const token = getAccessToken();
  const send = (accessToken: string | null) => {
    const headers = new Headers(options.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    else headers.delete("Authorization");
    return fetch(url, { ...options, headers });
  };
  const response = await send(token);
  if (response.status !== 401) return response;

  try {
    const refreshedToken = await refreshAccessToken(token);
    const retried = await send(refreshedToken);
    if (retried.status === 401) throw new SessionExpiredError();
    return retried;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      clearClientSession();
      if (redirectOnExpiry && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    throw error;
  }
}
