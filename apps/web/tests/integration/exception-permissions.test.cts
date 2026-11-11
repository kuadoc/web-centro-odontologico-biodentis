import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";
import { ExceptionService } from "@/modules/config/exception.service";
import { ScheduleConflictError } from "@/lib/errors";

process.env.JWT_ACCESS_SECRET = "exception-permissions-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar JWT antes de cargar las rutas.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Comparte el secreto de pruebas.
const route = require("@/app/api/config/exceptions/route") as typeof import("@/app/api/config/exceptions/route");
const actorId = randomUUID();

for (const role of Object.values(Role)) {
  test(`solo ADMIN registra excepciones: ${role}`, async (context) => {
    context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({
      userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000),
      user: { id: actorId, role, isActive: true },
    }));
    const create = context.mock.method(ExceptionService.prototype, "create", async () => ({ id: "exception" }));
    const response = await route.POST(new NextRequest("http://localhost/api/config/exceptions", {
      method: "POST", headers: { Authorization: `Bearer ${generateAccessToken(actorId, "session")}` },
      body: role === Role.ADMIN ? "{}" : "invalid-json",
    }));
    assert.equal(response.status, role === Role.ADMIN ? 201 : 403);
    assert.equal(create.mock.callCount(), role === Role.ADMIN ? 1 : 0);
    if (role === Role.ADMIN) assert.equal(create.mock.calls[0]?.arguments[1], actorId);
  });
}

test("ADMIN recibe 409 y el motivo del conflicto para mantener abierto el formulario", async (context) => {
  context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({
    userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000),
    user: { id: actorId, role: Role.ADMIN, isActive: true },
  }));
  context.mock.method(ExceptionService.prototype, "create", async () => { throw new ScheduleConflictError("Hay citas pendientes en la unidad seleccionada."); });
  const response = await route.POST(new NextRequest("http://localhost/api/config/exceptions", {
    method: "POST", headers: { Authorization: `Bearer ${generateAccessToken(actorId, "session")}` }, body: "{}",
  }));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Hay citas pendientes en la unidad seleccionada." });
});
