"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  /** Nombre en plural para el resumen ("citas", "odontologos"...). */
  label?: string
  pageSizeOptions?: number[]
}

function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  label = "registros",
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t bg-muted/50 p-4 sm:flex-row">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span className="text-xs text-muted-foreground">
          Mostrando {firstRow}-{lastRow} de {total} {label}
        </span>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="pagination-page-size">
            Filas por página:
          </label>
          <select
            id="pagination-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded border bg-transparent px-1 py-0.5 text-xs focus:outline-none"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          isDisabled={page <= 1}
          onPress={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          isDisabled={page >= totalPages}
          onPress={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export { Pagination }
