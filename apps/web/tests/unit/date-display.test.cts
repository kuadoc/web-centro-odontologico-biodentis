/* eslint-disable turbo/no-undeclared-env-vars -- TZ varía únicamente dentro de esta prueba para simular navegadores; no es configuración de la aplicación. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCalendarDate, formatDate, formatDateTime, formatTime } from "@workspace/ui/lib/utils";

test("las fechas civiles conservan el día en navegadores de distintas zonas horarias", () => {
  const originalZone = process.env.TZ;
  try {
    for (const zone of ["America/Lima", "UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      for (const [date, expected] of [
        ["2026-11-20", "20/11/2026"],
        ["2026-10-29", "29/10/2026"],
        ["2027-01-01", "01/01/2027"],
        ["2028-02-29", "29/02/2028"],
      ] as const) {
        assert.equal(formatCalendarDate(date), expected, zone);
        assert.equal(formatCalendarDate(`${date}T00:00:00.000Z`), expected, zone);
        assert.equal(formatCalendarDate(new Date(`${date}T00:00:00.000Z`)), expected, zone);
      }
      assert.equal(`${formatCalendarDate("2026-11-20T00:00:00.000Z")} ${formatTime("16:00")}`, "20/11/2026 16:00");
      assert.equal(formatDateTime("2026-11-20T21:00:59.987Z"), "20/11/2026, 16:00", zone);
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

test("los instantes de auditoría y registro se convierten a Lima sin segundos", () => {
  assert.equal(formatDateTime("2026-11-20T21:00:59.987Z"), "20/11/2026, 16:00");
  assert.equal(formatDateTime("2026-11-20T00:00:00.000Z"), "19/11/2026, 19:00");
  assert.equal(formatDateTime("2026-11-20T05:00:59.123Z"), "20/11/2026, 00:00");
  assert.equal(formatDate("2026-11-20T00:00:00.000Z"), "19/11/2026");
});

test("la hora de la cita conserva hora y minutos aunque incluya segundos o milisegundos", () => {
  assert.equal(formatTime("16:00"), "16:00");
  assert.equal(formatTime("16:00:45"), "16:00");
  assert.equal(formatTime("16:00:45.987"), "16:00");
  assert.equal(formatTime("00:00:00"), "00:00");
  assert.equal(formatTime("23:59:59.999"), "23:59");
});

test("los datos inválidos no muestran ISO crudo ni causan errores de renderizado", () => {
  for (const value of ["", "fecha-invalida"]) {
    assert.equal(formatCalendarDate(value), "—");
    assert.equal(formatDate(value), "—");
    assert.equal(formatDateTime(value), "—");
    assert.equal(formatTime(value), "—");
  }
  assert.equal(formatTime("25:99:00"), "—");
});
