import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ImagenStorageClaveSchema } from "@biodentis/shared-validators";
import { DomainError, InfrastructureError, NotFoundError, ValidationError } from "@/lib/errors";
import { s3Config } from "@/lib/env";
import type { StorageDriver } from "./storage.driver";

function status(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return undefined;
  const metadata = error.$metadata;
  return typeof metadata === "object" && metadata !== null && "httpStatusCode" in metadata && typeof metadata.httpStatusCode === "number" ? metadata.httpStatusCode : undefined;
}

/** Cliente creado al operar, nunca al importar ni durante el build. */
export class S3StorageDriver implements StorageDriver {
  private connection?: { client: S3Client; bucket: string; imagePrefix: string };

  private connect() {
    if (!this.connection) {
      const { endpoint, region, bucket, imagePrefix, accessKeyId, secretAccessKey } = s3Config();
      this.connection = { bucket, imagePrefix, client: new S3Client({
        endpoint, region, forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        maxAttempts: 3,
        requestHandler: { connectionTimeout: 5_000, requestTimeout: 30_000 },
      }) };
    }
    return this.connection;
  }

  /** Las rutas de la API siguen siendo lógicas; S3 guarda todo bajo imagen/. */
  private resolver(clave: string) {
    const logicalKey = ImagenStorageClaveSchema.parse(clave);
    const { client, bucket: Bucket, imagePrefix } = this.connect();
    return { client, Bucket, Key: `${imagePrefix}/${logicalKey}` };
  }

  async guardar(clave: string, contenido: Uint8Array): Promise<void> {
    ImagenStorageClaveSchema.parse(clave);
    if (!contenido.byteLength || contenido.byteLength > 5 * 1024 * 1024) throw new ValidationError("La imagen debe ocupar entre 1 byte y 5 MB");
    const { client, Bucket, Key } = this.resolver(clave);
    try {
      await client.send(new PutObjectCommand({
        Bucket, Key, Body: contenido, ContentType: "image/webp", ContentLength: contenido.byteLength,
        CacheControl: clave.startsWith("avatares/") ? "private, no-store" : "public, max-age=31536000, immutable",
        IfNoneMatch: "*",
      }));
    } catch (error) {
      if (status(error) === 412 || status(error) === 409) throw new DomainError("La imagen ya existe; vuelve a subirla", 409);
      throw new InfrastructureError("No se pudo guardar la imagen en S3");
    }
  }

  async leer(clave: string): Promise<Uint8Array> {
    const { client, Bucket, Key } = this.resolver(clave);
    try {
      const result = await client.send(new GetObjectCommand({ Bucket, Key }));
      if (!result.Body) throw new NotFoundError("Imagen no encontrada");
      return await result.Body.transformToByteArray();
    } catch (error) {
      if (error instanceof NotFoundError || status(error) === 404) throw new NotFoundError("Imagen no encontrada");
      throw new InfrastructureError("No se pudo leer la imagen de S3");
    }
  }

  async eliminar(clave: string): Promise<void> {
    const { client, Bucket, Key } = this.resolver(clave);
    try { await client.send(new DeleteObjectCommand({ Bucket, Key })); }
    catch (error) {
      if (status(error) !== 404) throw new InfrastructureError("No se pudo eliminar la imagen de S3");
    }
  }
}
