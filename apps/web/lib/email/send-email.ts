import React from "react";
import { createHash } from "node:crypto";
import { render, toPlainText } from "@react-email/render";
import { getSmtp } from "./smtp-client";
import { prisma } from "@/lib/prisma";
import { canSendEmail } from "./email-policy";

export type EmailType =
  | "password_reset"
  | "welcome"
  | "appointment_confirmation"
  | "appointment_registration"
  | "appointment_reminder"
  | "appointment_cancelled";

interface SendEmailParams {
  to: string;
  subject: string;
  react: React.ReactNode;
  type: EmailType;
  idempotencyKey?: string;
}

async function logEmailAttempt(data: {
  to: string;
  type: string;
  subject: string;
  status: string;
  error?: string;
}) {
  try {
    await prisma.emailLog.create({ data });
  } catch (err) {
    console.error("[EMAIL_LOG_FAILED]", { to: data.to, error: err });
  }
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!canSendEmail(params.to)) {
    console.info("[EMAIL_SKIPPED]", { type: params.type, reason: "delivery_policy" });
    return false;
  }
  try {
    const smtp = getSmtp();
    if (!smtp) {
      console.error("[EMAIL] Configuración SMTP de Gmail incompleta o inválida");
      return false;
    }
    const html = await render(params.react);
    // Correlación estable para la outbox. SMTP no garantiza deduplicación.
    const messageId = params.idempotencyKey
      ? `<biodentis.${createHash("sha256").update(params.idempotencyKey).digest("hex")}@gmail.com>`
      : undefined;
    const result = await smtp.transport.sendMail({
      from: smtp.from,
      to: params.to,
      subject: params.subject,
      html,
      text: toPlainText(html),
      messageId,
    });

    if (!result.accepted.length || result.rejected.length) {
      const message = "El servidor SMTP no aceptó al destinatario";
      console.error(
        "[EMAIL_FAILED]",
        JSON.stringify({
          to: params.to,
          type: params.type,
          error: message,
          timestamp: new Date().toISOString(),
        })
      );

      await logEmailAttempt({
        to: params.to,
        type: params.type,
        subject: params.subject,
        status: "failed",
        error: message,
      });

      return false;
    }

    console.log(
      "[EMAIL_SENT]",
      JSON.stringify({
        to: params.to,
        type: params.type,
        timestamp: new Date().toISOString(),
      })
    );

    await logEmailAttempt({
      to: params.to,
      type: params.type,
      subject: params.subject,
      status: "sent",
    });

    return true;
  } catch (error) {
    // No registrar respuestas SMTP completas: pueden incluir contenido o autenticación.
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code : "UNKNOWN";
    const safeCodes = ["EAUTH", "ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ETLS", "EENVELOPE", "EMESSAGE", "EPROTOCOL", "ECONNRESET", "ECONNREFUSED"];
    const message = `Error de envío SMTP (${safeCodes.includes(code) ? code : "UNKNOWN"})`;
    console.error(
      "[EMAIL_ERROR]",
      JSON.stringify({
        to: params.to,
        type: params.type,
        error: message,
        timestamp: new Date().toISOString(),
      })
    );

    await logEmailAttempt({
      to: params.to,
      type: params.type,
      subject: params.subject,
      status: "error",
      error: message,
    });

    return false;
  }
}
