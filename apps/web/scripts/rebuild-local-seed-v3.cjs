/* global require, process, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Mantenimiento local CommonJS. */
const { execFileSync } = require("node:child_process");
const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { parseEnv } = require("node:util");
const { Buffer } = require("node:buffer");
const { PrismaClient } = require("@prisma/client");

const web = resolve(__dirname, "..");
const root = resolve(web, "../..");
const container = "next-monorepo-postgres-1";
const volume = "next-monorepo_postgres_data";
const envPath = resolve(web, ".env");
const fileEnv = parseEnv(readFileSync(envPath, "utf8"));
const target = new URL(fileEnv.DATABASE_URL || "http://invalid");
const user = decodeURIComponent(target.username);
const sourceDatabase = decodeURIComponent(target.pathname.slice(1));
if (!["postgresql:", "postgres:"].includes(target.protocol) || !["localhost", "127.0.0.1"].includes(target.hostname) || (target.port && target.port !== "5432") || !["postgres", "biodentis"].includes(user)) {
  throw new Error("Solo se permite PostgreSQL local en el puerto 5432 con usuario postgres o biodentis.");
}
target.pathname = "/postgres";
if (!["biodentis", "postgres"].includes(sourceDatabase)) throw new Error("La base de origen no corresponde al recurso local autorizado.");
if (!target.password) throw new Error("Falta la contraseña PostgreSQL local.");
const password = fileEnv.SEED_DEMO_PASSWORD || "BiodentisLocal2026!";
if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) throw new Error("SEED_DEMO_PASSWORD no es válida.");
if (fileEnv.NODE_ENV === "production" || process.env.NODE_ENV === "production") throw new Error("No se admite producción.");
const env = { ...process.env, ...fileEnv, DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), SEED_DEMO_PASSWORD: password };
function docker(args) {
  return execFileSync("docker", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function child(args) {
  execFileSync(process.execPath, args, { cwd: web, env, stdio: "inherit" });
}

async function main() {
  if (!process.argv.includes("--replace-volume")) throw new Error("Se requiere --replace-volume para reemplazar los datos locales.");
  const mounts = JSON.parse(docker(["inspect", container, "--format", "{{json .Mounts}}"]));
  if (!mounts.some((mount) => mount.Type === "volume" && mount.Name === volume && mount.Destination === "/var/lib/postgresql/data")) {
    throw new Error("El volumen del contenedor no coincide con el recurso autorizado.");
  }
  const backupDir = resolve(root, ".backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dumpName = `${sourceDatabase}-before-volume-reset-${stamp}.dump`;
  docker(["start", container]);
  await new Promise((done, reject) => {
    let attempts = 0;
    const check = () => {
      try { docker(["exec", container, "pg_isready", "-U", user, "-d", sourceDatabase]); done(); }
      catch (error) { if (++attempts >= 60) { reject(error); return; } setTimeout(check, 500); }
    };
    check();
  });
  docker(["exec", container, "pg_dump", "-U", user, "-d", sourceDatabase, "-Fc", "-f", "/tmp/" + dumpName]);
  docker(["cp", `${container}:/tmp/${dumpName}`, resolve(backupDir, dumpName)]);
  docker(["exec", container, "pg_restore", "--list", "/tmp/" + dumpName]);
  console.log("Respaldo previo guardado en .backups/" + dumpName);

  // Destrucción explícitamente solicitada: solo el contenedor y volumen comprobados.
  docker(["rm", "-f", container]);
  docker(["volume", "rm", volume]);
  console.log("Contenedor y volumen anteriores eliminados.");
  execFileSync("docker", ["compose", "-p", "next-monorepo", "up", "-d", "postgres"], {
    cwd: root, env: { ...process.env, DB_USER: user, DB_PASSWORD: decodeURIComponent(target.password) }, stdio: "inherit",
  });
  await new Promise((done, reject) => {
    let attempts = 0;
    const check = () => {
      try { docker(["exec", container, "pg_isready", "-U", user, "-d", "postgres"]); done(); }
      catch (error) { if (++attempts >= 60) { reject(error); return; } setTimeout(check, 500); }
    };
    check();
  });

  let text = readFileSync(envPath, "utf8");
  for (const [key, value] of Object.entries({ DATABASE_URL: env.DATABASE_URL, DIRECT_URL: env.DIRECT_URL, SEED_DEMO_PASSWORD: password })) {
    const line = key + "=" + JSON.stringify(value);
    const pattern = new RegExp("^\\s*" + key + "\\s*=.*$", "gm");
    text = pattern.test(text) ? text.replace(pattern, () => line) : text.trimEnd() + "\n" + line + "\n";
  }
  writeFileSync(envPath, text);
  child(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  child(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);

  const db = new PrismaClient({ datasourceUrl: target.toString() });
  try {
    const summary = {
      database: "postgres", container, volume, backup: dumpName,
      users: await db.user.count(), appointments: await db.appointment.count(),
      clinicalRecords: await db.clinicalRecord.count(), treatmentPlans: await db.treatmentPlan.count(),
      emailTemplates: await db.emailTemplate.count(), outbox: await db.emailOutbox.count(),
      migrations: await db.$queryRawUnsafe("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name"),
      structure: await db.$queryRawUnsafe(`SELECT
        (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND contype='c') AS checks,
        (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND contype='x') AS exclusions,
        (SELECT count(*)::int FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers`),
    };
    const preflight = readFileSync(resolve(web, "prisma/preflight-integrity.sql"), "utf8").split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
    for (const statement of preflight.split(";").filter((statement) => statement.trim())) {
      if ((await db.$queryRawUnsafe(statement)).length) throw new Error("El preflight posterior contiene incidencias.");
    }
    if (summary.users !== 18 || summary.appointments !== 27 || summary.clinicalRecords !== 6 || summary.migrations.length !== 4) {
      throw new Error("Las cantidades no corresponden al seed v3.");
    }
    writeFileSync(resolve(backupDir, "seed-v3-rebuild-result.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
    console.log("BD postgres reconstruida y seed v3 verificado sin incidencias.");
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error("Reconstrucción local detenida:", error.code || error.name); process.exitCode = 1; });
