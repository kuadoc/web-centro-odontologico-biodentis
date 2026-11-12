"use client"

import {
  Button as AriaButton,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DateRangePicker as AriaDateRangePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
  RangeCalendar,
  type DateRangePickerProps,
  type DateValue,
} from "react-aria-components"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

export type DateRangePickerValue = NonNullable<
  DateRangePickerProps<DateValue>["value"]
>

type Props = Omit<DateRangePickerProps<DateValue>, "children" | "className"> & {
  className?: string
  label?: string
}

export function DateRangePicker({
  className,
  label = "Fecha de la cita",
  ...props
}: Props) {
  return (
    <I18nProvider locale="es-PE">
      <AriaDateRangePicker
        granularity="day"
        shouldForceLeadingZeros
        className={cn("min-w-0 space-y-1.5", className)}
        {...props}
      >
        <Label className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        <Group className="flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-2 text-xs transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 data-invalid:border-destructive">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="sr-only"
              >
                Desde
              </span>
              <DateInput slot="start" aria-label="Desde" className="flex min-w-0">
                {(segment) => (
                  <DateSegment
                    segment={segment}
                    className="rounded px-0.5 tabular-nums outline-none focus:bg-primary focus:text-primary-foreground data-placeholder:text-muted-foreground/70"
                  />
                )}
              </DateInput>
            </div>
            <span
              aria-hidden="true"
              className="text-muted-foreground"
            >
              –
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="sr-only"
              >
                Hasta
              </span>
              <DateInput slot="end" aria-label="Hasta" className="flex min-w-0">
                {(segment) => (
                  <DateSegment
                    segment={segment}
                    className="rounded px-0.5 tabular-nums outline-none focus:bg-primary focus:text-primary-foreground data-placeholder:text-muted-foreground/70"
                  />
                )}
              </DateInput>
            </div>
          </div>
          <AriaButton
            aria-label="Abrir calendario de rango de fechas"
            className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
          </AriaButton>
        </Group>
        <FieldError className="text-xs text-destructive">
          Revisa las fechas: «Hasta» debe ser igual o posterior a «Desde».
        </FieldError>
        <Popover
          placement="bottom end"
          offset={8}
          className="z-50 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none data-entering:animate-in data-entering:zoom-in-95 data-entering:fade-in"
        >
          <Dialog className="outline-none">
            <RangeCalendar firstDayOfWeek="mon" className="space-y-3">
              <header className="flex items-center justify-between gap-2">
                <Button
                  slot="previous"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Heading className="text-sm font-semibold capitalize" />
                <Button
                  slot="next"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </header>
              <CalendarGrid className="border-separate border-spacing-y-1">
                <CalendarGridHeader>
                  {(day) => (
                    <CalendarHeaderCell className="pb-2 text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-md text-sm tabular-nums outline-none hover:bg-muted data-focus-visible:ring-2 data-focus-visible:ring-ring data-outside-month:hidden data-selection-end:rounded-r-md data-selection-end:bg-primary data-selection-end:text-primary-foreground data-selection-start:rounded-l-md data-selection-start:bg-primary data-selection-start:text-primary-foreground data-selected:rounded-none data-selected:bg-primary/10 data-disabled:cursor-default data-disabled:text-muted-foreground/40"
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Selecciona la fecha inicial y la fecha final.
              </p>
            </RangeCalendar>
          </Dialog>
        </Popover>
      </AriaDateRangePicker>
    </I18nProvider>
  )
}
