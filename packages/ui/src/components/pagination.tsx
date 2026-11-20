"use client"

import { useId } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

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
  isLoading?: boolean
  showPageNumbers?: boolean
  ariaLabel?: string
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
  isLoading = false,
  showPageNumbers = false,
  ariaLabel = "Paginación",
}: PaginationProps) {
  const sizeId = useId()
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)
  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => startPage + index)

  return (
    <nav aria-label={ariaLabel} aria-busy={isLoading} className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/50 p-4">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span className="text-xs text-muted-foreground">
          Mostrando {firstRow}-{lastRow} de {total} {label}
        </span>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground" htmlFor={sizeId}>
            Filas por página:
          </label>
          <select
            id={sizeId}
            value={pageSize}
            disabled={isLoading}
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

      <div className="flex flex-wrap items-center gap-1">
        {showPageNumbers && <Button variant="outline" size="icon-sm" isDisabled={isLoading || page <= 1} onPress={() => onPageChange(1)} aria-label="Primera página"><ChevronsLeft className="h-4 w-4" /></Button>}
        <Button
          variant="outline"
          size="icon-sm"
          isDisabled={isLoading || page <= 1}
          onPress={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {showPageNumbers && pageNumbers.map((number) => <Button key={number} variant={number === page ? "default" : "outline"} size="icon-sm" isDisabled={isLoading} aria-label={`Ir a página ${number}`} aria-current={number === page ? "page" : undefined} onPress={() => onPageChange(number)}>{number}</Button>)}
        <span className="px-2 text-xs text-muted-foreground" aria-live="polite">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          isDisabled={isLoading || page >= totalPages}
          onPress={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {showPageNumbers && <Button variant="outline" size="icon-sm" isDisabled={isLoading || page >= totalPages} onPress={() => onPageChange(totalPages)} aria-label="Última página"><ChevronsRight className="h-4 w-4" /></Button>}
      </div>
    </nav>
  )
}

export { Pagination }
