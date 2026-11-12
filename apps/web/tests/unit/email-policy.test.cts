import assert from "node:assert/strict";
import { test } from "node:test";
import { canSendEmail } from "../../lib/email/email-policy";

test("correo de prueba: solo permite el destinatario autorizado sin redirigir mensajes", () => {
  const config = { EMAIL_MODE: "test", EMAIL_TEST_RECIPIENT: "owner@example.test" };
  assert.equal(canSendEmail("OWNER@example.test", config), true);
  assert.equal(canSendEmail("patient@example.test", config), false);
  assert.equal(canSendEmail("owner@example.test", { EMAIL_MODE: "test" }), false);
});

test("correo: modo live permite destinatarios y un modo desconocido bloquea envios", () => {
  assert.equal(canSendEmail("patient@example.test", { EMAIL_MODE: "live" }), true);
  assert.equal(canSendEmail("patient@example.test", { EMAIL_MODE: "invalid" }), false);
});
