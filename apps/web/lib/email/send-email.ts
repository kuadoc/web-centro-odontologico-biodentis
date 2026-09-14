import React from "react";
import { resend } from "./resend-client";
import { prisma } from "@/lib/prisma";

export type EmailType =
  | "password_reset"
  | "welcome"
  | "appointment_confirmation"
  | "appointment_reminder"
  | "appointment_cancelled";

interface SendEmailParams {
  to: string;
  subject: string;
  react: React.ReactNode;
  type: EmailType;
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
  const from = process.env.EMAIL_FROM;

  if (!from) {
    console.error("[EMAIL] EMAIL_FROM no está configurado");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      react: params.react,
    });

    if (error) {
      console.error(
        "[EMAIL_FAILED]",
        JSON.stringify({
          to: params.to,
          type: params.type,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      );

      await logEmailAttempt({
        to: params.to,
        type: params.type,
        subject: params.subject,
        status: "failed",
        error: error.message,
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
    const message = error instanceof Error ? error.message : "Error desconocido";
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
