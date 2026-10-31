/** Contrato común para disco local y almacenamiento compatible con S3/R2. */
export interface StorageDriver {
  /** Crear sin sobrescribir: las claves publicadas son inmutables. */
  guardar(clave: string, contenido: Uint8Array): Promise<void>;
  leer(clave: string): Promise<Uint8Array>;
  /** Idempotente si el archivo ya no existe. */
  eliminar(clave: string): Promise<void>;
}
