"use client";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function clearAuth(): void {
  if (typeof window === "undefined") return;
  fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    clearAuth();
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
}

/**
 * Descarga un archivo de un endpoint protegido.
 *
 * No se puede usar un `<a href>` normal porque el token va en la cabecera
 * Authorization, no en una cookie: hay que pedirlo por fetch y volcarlo a un blob.
 */
async function download(url: string, fallbackName: string): Promise<void> {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) {
    clearAuth();
    throw new Error("Sesión expirada");
  }
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${res.status})`);

  // El nombre real viene en Content-Disposition; si falta, usamos el de respaldo.
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? fallbackName;

  const blobUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export const api = {
  download,
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
