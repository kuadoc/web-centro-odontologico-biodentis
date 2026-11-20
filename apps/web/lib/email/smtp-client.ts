import nodemailer from "nodemailer";
import { smtpConfig } from "@/lib/env";

export function getSmtp() {
  const config = smtpConfig();
  if (!config) return undefined;

  // Sin pool ni cola en memoria: cada envío se espera dentro de su invocación.
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: true,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    auth: { user: config.user, pass: config.password },
    pool: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    dnsTimeout: 5_000,
    logger: false,
    debug: false,
  });
  return { transport, from: config.from };
}
