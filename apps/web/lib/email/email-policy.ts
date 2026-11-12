/** En pruebas solo se permite el destinatario original autorizado; nunca se redirigen correos. */
export function canSendEmail(to: string, config: { EMAIL_MODE?: string; EMAIL_TEST_RECIPIENT?: string } = {
  EMAIL_MODE: process.env.EMAIL_MODE,
  EMAIL_TEST_RECIPIENT: process.env.EMAIL_TEST_RECIPIENT,
}): boolean {
  const mode = config.EMAIL_MODE ?? "live";
  if (mode === "live") return true;
  if (mode !== "test") return false;
  const recipient = config.EMAIL_TEST_RECIPIENT?.trim().toLowerCase();
  return Boolean(recipient) && to.trim().toLowerCase() === recipient;
}
