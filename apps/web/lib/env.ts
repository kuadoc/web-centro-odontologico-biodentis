import { S3ConfigSchema, StorageDriverSchema } from "@biodentis/shared-validators";
import { InfrastructureError } from "@/lib/errors";

/** Configuración opcional de trabajos; su ausencia nunca autoriza el endpoint. */
export function cronSecret(): string | undefined { return process.env.CRON_SECRET?.trim() || undefined; }

export function emailPolicyConfig() {
  return {
    EMAIL_MODE: process.env.EMAIL_MODE,
    EMAIL_TEST_RECIPIENT: process.env.EMAIL_TEST_RECIPIENT,
  };
}

export function emailFrontendUrl(): string | undefined {
  return process.env.FRONTEND_URL;
}

/** Se valida al enviar: importar módulos o compilar no necesita credenciales SMTP. */
export function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  // Google muestra las contraseñas de aplicación agrupadas con espacios.
  const password = process.env.SMTP_PASSWORD?.replace(/\s/g, "");
  const from = process.env.EMAIL_FROM?.trim();
  if (host !== "smtp.gmail.com" || port !== 587 || process.env.SMTP_SECURE?.trim() !== "false" || !user || !password || !from) {
    return undefined;
  }
  return { host, port, secure: false as const, user, password, from };
}
export function storageDriverConfig() {
  const result = StorageDriverSchema.safeParse(process.env.STORAGE_DRIVER ?? "local");
  if (!result.success) throw new InfrastructureError("STORAGE_DRIVER debe ser local o s3");
  if (process.env.VERCEL && result.data !== "s3") {
    throw new InfrastructureError("Configura STORAGE_DRIVER=s3 para guardar imágenes en Vercel");
  }
  return result.data;
}

/** Se valida al operar: el build no necesita credenciales de almacenamiento. */
export function s3Config() {
  const result = S3ConfigSchema.safeParse({
    imagePrefix: process.env.S3_IMAGE_PREFIX,
    endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  });
  if (!result.success) throw new InfrastructureError("Completa la configuración S3 del servidor: endpoint HTTPS, región, bucket y credenciales");
  return result.data;
}

