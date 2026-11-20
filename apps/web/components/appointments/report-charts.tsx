"use client";

import { useId } from "react";
import { ArrowUpRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { AppointmentAnalytics, CancellationReport } from "@biodentis/shared-validators";
import { Card, CardHeader, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { formatCalendarDate } from "@workspace/ui/lib/utils";

type Series = { key: string; label: string; color: string };
type Metric = { label: string; value: number };
type Datum = { label: string; [key: string]: string | number };
const colors = ["var(--foreground)", "var(--muted-foreground)", "var(--report-chart-light)"];
const number = new Intl.NumberFormat("es-PE");
const monthLabel = new Intl.DateTimeFormat("es-PE", { month: "short", year: "2-digit", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });
const shortDate = (label: string) => label.length === 7 ? monthLabel.format(new Date(`${label}-01T00:00:00Z`)) : dayLabel.format(new Date(`${label}T00:00:00Z`));
const fullDate = (label: string) => label.length === 7 ? new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${label}-01T00:00:00Z`)) : formatCalendarDate(label);

function showDetail(id: string) {
  const target = document.getElementById(id);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}

function ReportTooltip({ active, payload, label, series, formatLabel }: Pick<TooltipContentProps<number, string>, "active" | "payload" | "label"> & { series: Series[]; formatLabel: (label: string) => string }) {
  if (!active || !payload?.length) return null;
  return <div className="min-w-44 max-w-72 rounded-xl border border-border bg-popover p-3.5 text-xs text-popover-foreground shadow-lg" data-report-tooltip>
    <p className="mb-3 break-words font-semibold">{formatLabel(String(label ?? ""))}</p>
    <dl className="space-y-2.5">{series.map((item) => {
      const value = payload.find((entry) => entry.dataKey === item.key)?.value;
      return <div key={item.key} className="flex items-center justify-between gap-5"><dt className="flex items-center gap-2 text-muted-foreground"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />{item.label}</dt><dd className="font-mono font-medium tabular-nums">{typeof value === "number" ? number.format(value) : String(value ?? 0)}</dd></div>;
    })}</dl>
  </div>;
}

function ReportChartCard({ title, description, data, series, metrics, note, detailId, formatTick = (value) => value.length > 15 ? `${value.slice(0, 14)}…` : value, formatLabel = (value) => value, emptyMessage = "Sin registros en este período." }: {
  title: string; description: string; data: Datum[]; series: Series[]; metrics: [Metric, Metric, Metric]; note: string; detailId: string;
  formatTick?: (label: string) => string; formatLabel?: (label: string) => string; emptyMessage?: string;
}) {
  const titleId = useId(); const descriptionId = useId();
  const hasValues = data.some((row) => series.some((item) => typeof row[item.key] === "number" && Number(row[item.key]) > 0));
  return <Card className="min-w-0 scroll-mt-24 gap-6 py-6 [--report-chart-light:var(--chart-1)] dark:[--report-chart-light:var(--chart-3)]" data-report-chart={title}>
    <CardHeader className="gap-2 px-5 sm:px-6"><h2 id={titleId} className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2><p id={descriptionId} className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{description}</p></CardHeader>
    <CardContent className="min-w-0 space-y-5 px-5 sm:px-6">
      <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border/70 bg-muted/20 py-4">{metrics.map((metric) => <div key={metric.label} className="min-w-0 px-3 sm:px-4"><dt className="min-h-12 text-[11px] leading-4 text-muted-foreground">{metric.label}</dt><dd className="mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{number.format(metric.value)}</dd></div>)}</dl>
      <div className="h-64 w-full min-w-0 sm:h-72" role="group" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} accessibilityLayer margin={{ top: 12, right: 4, bottom: 4, left: -16 }} barCategoryGap="24%" barGap={3}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={12} interval={data.length <= 6 ? 0 : "preserveStartEnd"} minTickGap={18} tickFormatter={(value) => formatTick(String(value))} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} height={42} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} tickCount={4} tickMargin={8} width={42} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5, radius: 6 }} content={(props) => <ReportTooltip {...props} series={series} formatLabel={formatLabel} />} />
            {series.map((item) => <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground" aria-label={`Leyenda de ${title}`}>{series.map((item) => <li key={item.key} className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: item.color }} />{item.label}</li>)}</ul>
      {!hasValues && <p role="status" className="text-center text-xs text-muted-foreground">{emptyMessage}</p>}
    </CardContent>
    <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-3 bg-transparent px-5 py-4 sm:px-6"><p className="max-w-lg text-[11px] leading-relaxed text-muted-foreground">{note}</p><Button variant="outline" size="sm" onPress={() => showDetail(detailId)}>Ver reporte detallado<ArrowUpRight className="size-3.5" aria-hidden="true" /></Button></CardFooter>
  </Card>;
}

export function AppointmentEvolutionChart({ data }: { data: AppointmentAnalytics }) {
  const grouping = data.granularity === "day" ? "día" : data.granularity === "week" ? "semana (lunes)" : "mes";
  return <ReportChartCard title="Citas y atenciones realizadas" description={`Comparación por ${grouping}, del ${formatCalendarDate(data.start)} al ${formatCalendarDate(data.end)}. Cada grupo corresponde a la fecha programada de la cita.`}
    data={data.timeline.map((entry) => ({ ...entry, label: entry.date }))}
    series={[{ key: "total", label: "Citas totales", color: colors[1]! }, { key: "completed", label: "Atenciones realizadas", color: colors[0]! }]}
    metrics={[{ label: "Citas del período", value: data.summary.total }, { label: "Atenciones realizadas", value: data.summary.completed }, { label: "Pacientes únicos atendidos", value: data.summary.patients }]}
    formatTick={shortDate} formatLabel={fullDate} detailId="report-appointments-detail"
    note="Las atenciones están incluidas en el total de citas. Solo se consideran realizadas las citas completadas." />;
}

export function AppointmentRankingChart({ title, description, rows, summary }: { title: string; description: string; rows: AppointmentAnalytics["dentists"]; summary: AppointmentAnalytics["summary"] }) {
  return <ReportChartCard title={title} description={description}
    data={rows.slice(0, 10).map((row, index) => ({ label: `${index + 1}. ${row.name}`, completed: row.completed, patients: row.patients }))}
    series={[{ key: "completed", label: "Atenciones", color: colors[0]! }, { key: "patients", label: "Pacientes únicos", color: colors[1]! }]}
    metrics={[{ label: "Atenciones del período", value: summary.completed }, { label: "Pacientes únicos del período", value: summary.patients }, { label: "Resultados con atención", value: rows.length }]}
    detailId="report-appointments-detail" emptyMessage="Sin atenciones completadas en el período."
    note={`${rows.length > 10 ? `Se muestran los 10 primeros de ${rows.length}. ` : ""}Ordenado por atenciones; los KPI resumen todo el período. El Excel conserva el listado completo.`} />;
}

export function CancellationActivityCharts({ data }: { data: CancellationReport }) {
  const totals = data.activity.reduce((acc, row) => ({ requests: acc.requests + row.requests, cancellations: acc.cancellations + row.cancellations, reassignments: acc.reassignments + row.reassignments }), { requests: 0, cancellations: 0, reassignments: 0 });
  return <div className="grid items-stretch gap-5 xl:grid-cols-2">
    <ReportChartCard title="Actividad de los últimos seis meses" description="Solicitudes al emitirse, cancelaciones al resolverse y cambios de odontólogo por fecha de registro. Zona horaria de Lima."
      data={data.activity.map((row) => ({ ...row, label: row.month }))}
      series={[{ key: "requests", label: "Solicitudes", color: colors[0]! }, { key: "cancellations", label: "Cancelaciones", color: colors[1]! }, { key: "reassignments", label: "Reasignaciones", color: colors[2]! }]}
      metrics={[{ label: "Solicitudes · 6 meses", value: totals.requests }, { label: "Cancelaciones · 6 meses", value: totals.cancellations }, { label: "Reasignaciones · 6 meses", value: totals.reassignments }]}
      formatTick={shortDate} formatLabel={fullDate} detailId="report-cancellations-detail" note="Cada barra representa movimientos registrados durante ese mes; una cita puede generar varios movimientos." />
    <ReportChartCard title="Estado de las cancelaciones" description="Distribución del historial registrado en el flujo de cancelaciones. Estos totales históricos no dependen del filtro de la tabla."
      data={[{ label: "Historial de cancelaciones", requested: data.summary.requested, approved: data.summary.approved, rejected: data.summary.rejected }]}
      series={[{ key: "requested", label: "Por revisar", color: colors[0]! }, { key: "approved", label: "Canceladas", color: colors[1]! }, { key: "rejected", label: "Rechazadas", color: colors[2]! }]}
      metrics={[{ label: "Por revisar", value: data.summary.requested }, { label: "Canceladas", value: data.summary.approved }, { label: "Rechazadas", value: data.summary.rejected }]}
      formatTick={() => "Total histórico"} detailId="report-cancellations-detail" note="Las solicitudes por revisar todavía no cancelan la cita. La tabla permite consultar el detalle de cada decisión." />
  </div>;
}
