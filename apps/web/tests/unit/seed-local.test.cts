import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLocalAppointments, readLocalSeedConfig, seedDate, seedId, seedLocal, LOCAL_SEED_VERSION } from "../../prisma/seed-local";
import type { PrismaClient } from "@prisma/client";

test("seed v3: rechaza una estructura incompleta antes de escribir datos", async () => {
  let writes = 0;
  const database = {
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => operation({
      $queryRaw: async () => [{ counters: null, outbox: null, sequence: null, history: null, checks: 0, exclusion: false, triggers: 0, dniUnique: false }],
      user: { upsert: async () => { writes++; } },
    }),
  } as unknown as PrismaClient;
  assert.equal(LOCAL_SEED_VERSION, 3);
  await assert.rejects(seedLocal(database, "fake-hash"), { name: "LocalSeedSchemaError" });
  assert.equal(writes, 0);
});

const local = {
  DATABASE_URL: "postgresql://demo:demo@localhost:5432/biodentis_local",
  DIRECT_URL: "postgresql://demo:demo@127.0.0.1:5432/biodentis_local",
  SEED_DEMO_PASSWORD: "SoloPruebasLocales123!",
};

test("seed: permite configuración local y rechaza producción o conexiones remotas", () => {
  assert.equal(readLocalSeedConfig(local).password, local.SEED_DEMO_PASSWORD);
  assert.throws(() => readLocalSeedConfig({ ...local, NODE_ENV: "production" }), /producción/);
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    for (const value of ["", "postgresql://demo:demo@db.example.test:5432/database", "https://localhost/database", "postgresql://localhost"]) {
      assert.throws(() => readLocalSeedConfig({ ...local, [key]: value }));
    }
  }
});

test("seed: exige contraseña válida sin exponerla en errores", () => {
  for (const password of ["", "corta", "á".repeat(37)]) {
    assert.throws(() => readLocalSeedConfig({ ...local, SEED_DEMO_PASSWORD: password }), /SEED_DEMO_PASSWORD/);
  }
  const secret = "secreto-no-debe-aparecer";
  assert.throws(() => readLocalSeedConfig({ ...local, DATABASE_URL: `postgresql://demo:${secret}@db.example.test/database` }), (error: Error) => !error.message.includes(secret));
});

test("seed: calcula el día civil de Lima y cruces de mes/año", () => {
  const instant = new Date("2027-01-01T02:00:00Z");
  assert.equal(seedDate(0, instant).toISOString(), "2026-12-31T00:00:00.000Z");
  assert.equal(seedDate(1, instant).toISOString(), "2027-01-01T00:00:00.000Z");
});

test("seed: fixtures estables, sin cruces de dentista, sillón o paciente", () => {
  const fixtures = buildLocalAppointments(new Date("2026-11-18T17:00:00Z"));
  assert.equal(fixtures.length, 27);
  assert.equal(new Set(fixtures.map((item) => item.id)).size, fixtures.length);
  assert.equal(fixtures.filter((item) => item.status === "COMPLETED").length, 6);
  assert.deepEqual(new Set(fixtures.map((item) => item.status)), new Set(["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]));
  const later = buildLocalAppointments(new Date("2026-11-19T17:00:00Z"));
  assert.deepEqual(fixtures.map((item) => item.id), later.map((item) => item.id));
  for (const [index, item] of fixtures.entries()) {
    assert.match(item.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.ok(item.time >= "08:00" && item.time < item.endTime && item.endTime <= "18:00");
    assert.equal(Math.floor(item.service / 3), item.dentist);
    for (const other of fixtures.slice(index + 1)) {
      if (item.date.getTime() !== other.date.getTime() || item.status === "CANCELLED" || other.status === "CANCELLED") continue;
      if (item.dentist === other.dentist || item.patient === other.patient) {
        assert.ok(item.endTime <= other.time || other.endTime <= item.time);
      }
    }
  }
  assert.equal(seedId("admin"), seedId("admin"));
});

test("seed: cada plan tiene dos sesiones completadas y una futura del mismo paciente/servicio", () => {
  const fixtures = buildLocalAppointments(new Date("2026-11-18T17:00:00Z"));
  for (let dentist = 0; dentist < 3; dentist++) {
    const sessions = fixtures.filter((item) => item.dentist === dentist && item.session);
    assert.deepEqual(sessions.map((item) => item.session), [1, 2, 3]);
    assert.equal(new Set(sessions.map((item) => item.patient)).size, 1);
    assert.equal(new Set(sessions.map((item) => item.service)).size, 1);
    assert.equal(sessions.filter((item) => item.status === "COMPLETED").length, 2);
    assert.ok(sessions[2]!.offset > 1);
  }
});
