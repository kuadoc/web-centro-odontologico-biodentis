import { Resend } from "resend";

let client: Resend | undefined;

export function getResend(): Resend | undefined {
  const key = process.env.RESEND_API_KEY;
  if (!key) return undefined;
  client ??= new Resend(key);
  return client;
}
