import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";
import { CancellationService } from "@/modules/appointments/cancellation.service";
import { EmailOutboxService } from "@/modules/appointments/email-outbox.service";

process.env.JWT_ACCESS_SECRET = "cancellation-permissions-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar JWT antes de cargar los handlers.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de configurar JWT.
const cancel = require("@/app/api/appointments/[id]/cancel/route") as typeof import("@/app/api/appointments/[id]/cancel/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de configurar JWT.
const request = require("@/app/api/appointments/[id]/cancellation-requests/route") as typeof import("@/app/api/appointments/[id]/cancellation-requests/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de configurar JWT.
const review = require("@/app/api/appointment-cancellations/[id]/review/route") as typeof import("@/app/api/appointment-cancellations/[id]/review/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de configurar JWT.
const report = require("@/app/api/reports/cancellations/route") as typeof import("@/app/api/reports/cancellations/route");

const actorId = randomUUID();
const id = randomUUID();
const params = { params: Promise.resolve({ id }) };
for (const role of Object.values(Role)) {
  test(`cancelaciones API: permisos de ${role} y actor tomado de sesión`, async (context) => {
    context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({ userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000), user: { id: actorId, role, isActive: true } }));
    const notice = context.mock.method(EmailOutboxService.prototype, "tryDeliver", async () => true);
    const token = generateAccessToken(actorId, "session");
    const actions = [
      { handler: cancel.PATCH, method: "PATCH", operation: "cancel", role: Role.RECEPTIONIST, status: 200 },
      { handler: request.POST, method: "POST", operation: "request", role: Role.RECEPTIONIST, status: 201 },
      { handler: review.PATCH, method: "PATCH", operation: "review", role: Role.ADMIN, status: 200 },
    ] as const;
    for (const action of actions) {
      const operation = action.operation === "cancel" && role === Role.PATIENT ? "cancelOwn" : action.operation;
      const write = context.mock.method(CancellationService.prototype, operation, async () => ({ id, state: "APPROVED", appointmentId: id }));
      const allowed = role === action.role || (action.operation === "cancel" && role === Role.PATIENT);
      const response = await action.handler(new NextRequest("http://localhost/api/test", { method: action.method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: allowed ? JSON.stringify({ reason: "Motivo de prueba suficientemente detallado.", actorId: randomUUID(), role: "ADMIN" }) : "invalid-json" }), params);
      assert.equal(response.status, allowed ? action.status : 403);
      assert.equal(write.mock.callCount(), allowed ? 1 : 0);
      if (allowed) assert.equal(write.mock.calls[0]!.arguments[2], actorId);
    }
    const read = context.mock.method(CancellationService.prototype, "report", async () => ({}));
    const response = await report.GET(new NextRequest("http://localhost/api/reports/cancellations", { headers: { Authorization: `Bearer ${token}` } }));
    assert.equal(response.status, role === Role.ADMIN ? 200 : 403);
    assert.equal(read.mock.callCount(), role === Role.ADMIN ? 1 : 0);
    if (role === Role.ADMIN) assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(notice.mock.callCount(), role === Role.ADMIN || role === Role.RECEPTIONIST || role === Role.PATIENT ? 1 : 0);
  });
}

test("sin sesión no se consulta información ni se acepta una cancelación", async (context) => {
  const write = context.mock.method(CancellationService.prototype, "cancel", async () => ({}));
  const read = context.mock.method(CancellationService.prototype, "report", async () => ({}));
  assert.equal((await cancel.PATCH(new NextRequest("http://localhost/api/test", { method: "PATCH", body: "invalid-json" }), params)).status, 401);
  assert.equal((await report.GET(new NextRequest("http://localhost/api/reports/cancellations"))).status, 401);
  assert.equal(write.mock.callCount(), 0);
  assert.equal(read.mock.callCount(), 0);
});
