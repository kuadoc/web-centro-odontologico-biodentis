import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { readLocalSeedConfig, seedLocal } from "./seed-local";

async function main() {
  const { password } = readLocalSeedConfig(process.env);
  const passwordHash = await bcrypt.hash(password, 12);
  const prisma = new PrismaClient();
  try {
    const summary = await seedLocal(prisma, passwordHash);
    console.log(`Seed local v${summary.version} completado (datos ficticios, calendario America/Lima).`);
    console.table(summary.accounts);
    console.log(`${summary.appointments} citas, ${summary.records} notas clínicas y 3 planes de tratamiento.`);
    console.log("Contraseña demo: SEED_DEMO_PASSWORD de apps/web/.env.");
    console.log("Repetir restaura fixtures y contraseñas demo; no borra otros registros.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error && ["LocalSeedConfigError", "LocalSeedSchemaError"].includes(error.name)) console.error(error.message);
  else {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? ` (${error.code})` : "";
    console.error(`No se completó el seed local${code}. Comprueba conexión, migraciones y conflictos con datos previos. Un fallo durante la carga revierte su transacción.`);
  }
  process.exitCode = 1;
});
