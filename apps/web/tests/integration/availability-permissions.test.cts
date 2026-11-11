import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";
import { AvailabilityService } from "@/modules/availability/availability.service";
import { ScheduleConflictError } from "@/lib/errors";

process.env.JWT_ACCESS_SECRET = "availability-permission-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Inicializar el secreto antes de cargar JWT.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Comparte la clave de fixtures.
const { PUT } = require("@/app/api/dentists/[id]/availability/route") as typeof import("@/app/api/dentists/[id]/availability/route");
const actorId = randomUUID();
const dentistId = randomUUID();

for (const role of Object.values(Role)) {
  test(`guardar horario: permisos de ${role} y respuesta de conflicto`, async (context) => {
    context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({ userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000), user: { id: actorId, isActive: true, role } }));
    const save = context.mock.method(AvailabilityService.prototype, "replaceWeekly", async () => { throw new ScheduleConflictError("No puedes desactivar este horario: aún hay citas programadas."); });
    const response = await PUT(new NextRequest(`http://localhost/api/dentists/${dentistId}/availability`, {
      method: "PUT", headers: { Authorization: `Bearer ${generateAccessToken(actorId, "session")}`, "Content-Type": "application/json" },
      body: role === Role.ADMIN ? JSON.stringify({ days: [] }) : "invalid-json",
    }), { params: Promise.resolve({ id: dentistId }) });
    assert.equal(response.status, role === Role.ADMIN ? 409 : 403);
    assert.equal(save.mock.callCount(), role === Role.ADMIN ? 1 : 0);
    if (role === Role.ADMIN) {
      assert.match((await response.json()).error, /aún hay citas programadas/);
      assert.deepEqual(save.mock.calls[0]?.arguments, [dentistId, { days: [] }, actorId]);
    }
  });
}

test("sin sesión no se modifica el horario ni se lee el body", async (context) => {
  const save = context.mock.method(AvailabilityService.prototype, "replaceWeekly", async () => ({}));
  const response = await PUT(new NextRequest(`http://localhost/api/dentists/${dentistId}/availability`, { method: "PUT", body: "invalid-json" }), { params: Promise.resolve({ id: dentistId }) });
  assert.equal(response.status, 401);
  assert.equal(save.mock.callCount(), 0);
});
