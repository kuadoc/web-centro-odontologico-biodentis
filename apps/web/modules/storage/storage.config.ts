import { existsSync } from "node:fs";
import path from "node:path";
import { storageDriverConfig } from "@/lib/env";
import { LocalStorageDriver } from "./drivers/local.driver";
import { S3StorageDriver } from "./drivers/s3.driver";
import type { StorageDriver } from "./drivers/storage.driver";

export function obtenerCarpetaUploads(): string {
  const cwd = process.cwd();
  const web = existsSync(path.join(cwd, "apps", "web", "app")) ? path.join(cwd, "apps", "web") : cwd;
  return path.resolve(web, "uploads");
}

export function crearStorageDriver(): StorageDriver {
  return storageDriverConfig() === "s3" ? new S3StorageDriver() : new LocalStorageDriver(obtenerCarpetaUploads());
}
