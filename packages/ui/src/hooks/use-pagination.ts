"use client"

import { useMemo, useState } from "react"

/**
 * Paginacion en cliente sobre una lista ya cargada.
 * `resetKey` (p. ej. los filtros activos) vuelve a la pagina 1 al cambiar.
 */
export function usePagination<T>(items: T[], initialPageSize = 10, resetKey?: string) {
  const [state, setState] = useState({ page: 1, pageSize: initialPageSize, key: resetKey })

  // Reinicio derivado durante el render: evita un efecto con setState.
  // Registrar la nueva clave impide recuperar una página vieja al limpiar filtros.
  if (state.key !== resetKey) {
    setState({ page: 1, pageSize: state.pageSize, key: resetKey })
  }
  const page = state.key === resetKey ? state.page : 1
  const pageSize = state.pageSize

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  )

  return {
    pageItems,
    page: safePage,
    pageSize,
    total,
    totalPages,
    setPage: (p: number) => setState({ page: p, pageSize, key: resetKey }),
    setPageSize: (size: number) => setState({ page: 1, pageSize: size, key: resetKey }),
  }
}
