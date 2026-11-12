"use client"

import { Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components"
import type { LucideIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export interface ActionMenuItem {
  id: string
  label: string
  icon: LucideIcon
  onAction: () => void
  isHidden?: boolean
  isDisabled?: boolean
  destructive?: boolean
}

/** Acciones por registro con foco, teclado, typeahead y posicionamiento accesibles. */
export function ActionMenu({
  label,
  items,
}: {
  label: string
  items: readonly ActionMenuItem[]
}) {
  const visibleItems = items.filter((item) => !item.isHidden)
  if (!visibleItems.length) return null

  return (
    <MenuTrigger>
      <Button variant="outline" size="sm" className="min-w-16" aria-label={label}>
        Ver
      </Button>
      <Popover
        placement="bottom end"
        offset={4}
        className="z-[60] min-w-48 max-w-[calc(100vw-2rem)] overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0"
      >
        <Menu aria-label={label} items={visibleItems} className="outline-none">
          {(item) => (
            <MenuItem
              id={item.id}
              textValue={item.label}
              onAction={item.onAction}
              isDisabled={item.isDisabled}
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-focused:bg-accent data-focused:text-accent-foreground data-disabled:pointer-events-none data-disabled:cursor-default data-disabled:opacity-50",
                item.destructive && "text-destructive data-focused:bg-destructive/10 data-focused:text-destructive",
              )}
            >
              <item.icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{item.label}</span>
            </MenuItem>
          )}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
