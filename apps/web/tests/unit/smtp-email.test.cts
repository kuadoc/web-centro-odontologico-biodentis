import assert from "node:assert/strict";
import { test } from "node:test";
import nodemailer from "nodemailer";
import { createElement } from "react";
import { smtpConfig } from "@/lib/env";

test("SMTP: política, STARTTLS, contenido, aceptación, fallos y correlación sin conexiones reales", async (context) => {
  // Sustituir la frontera de BD antes de cargar el módulo, sin crear un cliente real.
  const previousPrisma = "prisma" in globalThis ? globalThis.prisma : undefined;
  const fakePrisma = { emailLog: { create: async () => ({}) } };
  Object.assign(globalThis, { prisma: fakePrisma });
  context.after(() => { Object.assign(globalThis, { prisma: previousPrisma }); });
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Cargar después de sustituir el singleton de Prisma.
  const { sendEmail } = require("@/lib/email/send-email") as typeof import("@/lib/email/send-email");
  const values = {
    SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "587", SMTP_SECURE: "false",
    SMTP_USER: "sender@example.test", SMTP_PASSWORD: "fake app password",
    EMAIL_FROM: "BIODENTIS <sender@example.test>", EMAIL_MODE: "test",
    EMAIL_TEST_RECIPIENT: "patient@example.test",
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  context.mock.method(console, "error", () => {});
  context.mock.method(console, "info", () => {});
  context.mock.method(console, "log", () => {});
  const logs = context.mock.method(fakePrisma.emailLog, "create", async () => ({}));
  const messages: nodemailer.SendMailOptions[] = [];
  let outcome: "accepted" | "rejected" | "error" = "accepted";
  const transport = context.mock.method(nodemailer, "createTransport", (options: unknown) => {
    assert.ok(options && typeof options === "object");
    const config = options as Record<string, unknown>;
    assert.equal(config.host, "smtp.gmail.com");
    assert.equal(config.port, 587);
    assert.equal(config.secure, false);
    assert.equal(config.requireTLS, true);
    assert.equal(config.pool, false);
    assert.deepEqual(config.tls, { minVersion: "TLSv1.2", rejectUnauthorized: true });
    assert.deepEqual(config.auth, { user: values.SMTP_USER, pass: "fakeapppassword" });
    return { sendMail: async (message: nodemailer.SendMailOptions) => {
      messages.push(message);
      if (outcome === "error") throw Object.assign(new Error("private SMTP response"), { code: "EAUTH" });
      return outcome === "accepted"
        ? { accepted: [values.EMAIL_TEST_RECIPIENT], rejected: [] }
        : { accepted: [], rejected: [values.EMAIL_TEST_RECIPIENT] };
    } };
  });
  const params = {
    to: values.EMAIL_TEST_RECIPIENT, subject: "Prueba clínica",
    react: createElement("p", null, "Contenido de prueba"),
    type: "password_reset" as const, idempotencyKey: "stable-job",
  };
  assert.equal(await sendEmail({ ...params, to: "excluded@example.test" }), false);
  assert.equal(transport.mock.callCount(), 0);
  assert.equal(logs.mock.callCount(), 0);
  process.env.EMAIL_TEST_RECIPIENT = "";
  assert.equal(await sendEmail(params), false);
  assert.equal(transport.mock.callCount(), 0);
  process.env.EMAIL_TEST_RECIPIENT = values.EMAIL_TEST_RECIPIENT;
  delete process.env.SMTP_PASSWORD;
  assert.equal(await sendEmail(params), false);
  assert.equal(transport.mock.callCount(), 0);
  process.env.SMTP_PASSWORD = values.SMTP_PASSWORD;
  process.env.SMTP_SECURE = "true";
  assert.equal(smtpConfig(), undefined);
  process.env.SMTP_SECURE = "false";
  assert.equal(await sendEmail(params), true);
  assert.equal(messages[0]?.from, values.EMAIL_FROM);
  assert.equal(messages[0]?.to, params.to);
  assert.ok(String(messages[0]?.html).includes("Contenido de prueba"));
  assert.ok(String(messages[0]?.text).includes("Contenido de prueba"));
  assert.equal(await sendEmail(params), true);
  assert.equal(messages[0]?.messageId, messages[1]?.messageId);
  outcome = "rejected";
  assert.equal(await sendEmail(params), false);
  outcome = "error";
  assert.equal(await sendEmail(params), false);
  const logged = JSON.stringify(logs.mock.calls.map((call) => call.arguments));
  assert.ok(logged.includes("sent"));
  assert.ok(logged.includes("failed"));
  assert.ok(logged.includes("EAUTH"));
  assert.equal(logged.includes("private SMTP response"), false);
  outcome = "accepted";
  logs.mock.mockImplementation(async () => { throw new Error("Database unavailable"); });
  assert.equal(await sendEmail(params), true);
});
