"use client";

import { api } from "@/lib/api-client";

/** Comparte renovación, errores y reintentos con las consultas de React Query. */
export function useApi() {
  return api;
}
