import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { Role } from "@biodentis/shared-types";
import { AccessSessionRepository } from "@/modules/auth/access-session.repository";
import { ReassignmentService } from "@/modules/appointments/reassignment.service";
import { UserRepository } from "@/modules/users/user.repository";

process.env.JWT_ACCESS_SECRET = "reassignment-permissions-test-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Configurar el secreto antes de cargar JWT.
const { generateAccessToken } = require("@/lib/auth") as typeof import("@/lib/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de configurar JWT.
const reassign = require("@/app/api/appointments/[id]/reassign/route") as typeof import("@/app/api/appointments/[id]/reassign/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de configurar JWT.
const report = require("@/app/api/reports/reassignments/route") as typeof import("@/app/api/reports/reassignments/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de configurar JWT.
const users = require("@/app/api/users/[id]/route") as typeof import("@/app/api/users/[id]/route");

const actorId = randomUUID();
const appointmentId = randomUUID();
const params = { params: Promise.resolve({ id: appointmentId }) };
const token = () => generateAccessToken(actorId, "session");

for (const role of Object.values(Role)) {
  test(`API: acceso al reporte de ${role}`, async (context) => {
    context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({ userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000), user: { id: actorId, role, isActive: true } }));
    const read = context.mock.method(ReassignmentService.prototype, "report", async () => ({ items: [], total: 0, page: 1, pageSize: 25 }));
    const response = await report.GET(new NextRequest("http://localhost/api/reports/reassignments", { headers: { Authorization: `Bearer ${token()}` } }));
    assert.equal(response.status, role === Role.ADMIN ? 200 : 403);
    assert.equal(read.mock.callCount(), role === Role.ADMIN ? 1 : 0);
    if (role === Role.ADMIN) assert.equal(response.headers.get("Cache-Control"), "no-store");
  });

  test(`API: acceso a reasignación de ${role}`, async (context) => {
    context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({ userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000), user: { id: actorId, role, isActive: true } }));
    const write = context.mock.method(ReassignmentService.prototype, "reassign", async () => ({ id: appointmentId }));
    const permitted = role === Role.ADMIN || role === Role.RECEPTIONIST;
    const response = await reassign.PATCH(new NextRequest("http://localhost/api/appointments/test/reassign", {
      method: "PATCH", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }, body: permitted ? "{}" : "invalid-json",
    }), params);
    assert.equal(response.status, permitted ? 200 : 403);
    assert.equal(write.mock.callCount(), permitted ? 1 : 0);
    if (permitted) assert.equal(write.mock.calls[0]?.arguments[2], actorId);
  });
}

test("sin sesión no se consulta el reporte ni se ejecuta la reasignación", async (context) => {
  const read = context.mock.method(ReassignmentService.prototype, "report", async () => ({}));
  const write = context.mock.method(ReassignmentService.prototype, "reassign", async () => ({}));
  assert.equal((await report.GET(new NextRequest("http://localhost/api/reports/reassignments"))).status, 401);
  assert.equal((await reassign.PATCH(new NextRequest("http://localhost/api/appointments/test/reassign", { method: "PATCH", body: "invalid-json" }), params)).status, 401);
  assert.equal(read.mock.callCount(), 0);
  assert.equal(write.mock.callCount(), 0);
});

test("DELETE y PATCH no pueden desactivar un odontólogo con citas por atender", async (context) => {
  const repository = new UserRepository();
  context.mock.method(AccessSessionRepository.prototype, "findByJti", async () => ({ userId: actorId, revokedAt: null, expiresAt: new Date(Date.now() + 3600000), user: { id: actorId, role: Role.ADMIN, isActive: true } }));
  context.mock.method(UserRepository.prototype, "withTransaction", async (operation: (repo: UserRepository) => Promise<unknown>) => operation(repository));
  context.mock.method(UserRepository.prototype, "findById", async () => ({ id: appointmentId, role: "DENTIST", isActive: true }));
  context.mock.method(UserRepository.prototype, "countBlockingAppointments", async () => ({ pending: 2, confirmed: 1 }));
  const write = context.mock.method(UserRepository.prototype, "update", async () => { throw new Error("No debe modificar al usuario"); });
  for (const method of ["PATCH", "DELETE"] as const) {
    const request = new NextRequest("http://localhost/api/users/test", { method, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }, ...(method === "PATCH" ? { body: JSON.stringify({ isActive: false }) } : {}) });
    const response = await users[method](request, params);
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /2 citas pendientes y 1 confirmadas/);
  }
  assert.equal(write.mock.callCount(), 0);
});
