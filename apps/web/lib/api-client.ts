"use client";

import { authenticatedFetch } from "@/lib/client-session";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await authenticatedFetch(url, { ...options, headers });

  if (!res.ok) {
    let errMsg = "Error en la solicitud";
    try {
      const err = await res.json();
      errMsg = err.error || err.message || `HTTP ${res.status}`;
    } catch {
      errMsg = `HTTP ${res.status} ${res.statusText}`;
    }
    throw new ApiError(errMsg, res.status);
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
  const res = await authenticatedFetch(url);
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
