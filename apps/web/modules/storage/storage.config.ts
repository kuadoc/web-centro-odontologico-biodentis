import { existsSync } from "node:fs";
import path from "node:path";
import { StorageDriverSchema } from "@biodentis/shared-validators";
import { InfrastructureError } from "@/lib/errors";
import { LocalStorageDriver } from "./drivers/local.driver";
import { S3StorageDriver } from "./drivers/s3.driver";
import type { StorageDriver } from "./drivers/storage.driver";

export function obtenerCarpetaUploads(): string {
  const cwd = process.cwd();
  const web = existsSync(path.join(cwd, "apps", "web", "app")) ? path.join(cwd, "apps", "web") : cwd;
  return path.resolve(web, "uploads");
}

export function crearStorageDriver(): StorageDriver {
  const config = StorageDriverSchema.safeParse(process.env.STORAGE_DRIVER ?? "local");
  if (!config.success) throw new InfrastructureError("STORAGE_DRIVER debe ser local o s3");
  return config.data === "s3" ? new S3StorageDriver() : new LocalStorageDriver(obtenerCarpetaUploads());
}
