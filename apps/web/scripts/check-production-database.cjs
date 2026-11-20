/* global require, process, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Herramienta operativa CommonJS. */
const { readFileSync, readdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const connection = process.env.DIRECT_URL;
  if (!connection) throw Object.assign(new Error(), { code: "DIRECT_URL_REQUIRED" });
  const target = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(target.protocol)) throw Object.assign(new Error(), { code: "POSTGRESQL_URL_REQUIRED" });
  const local = ["localhost", "127.0.0.1"].includes(target.hostname);
  const allowLocal = process.argv.includes("--local");
  if (local ? !allowLocal || target.port !== "5432" || target.pathname !== "/postgres" : !/(^|\.)(supabase\.co|supabase\.com)$/.test(target.hostname)) {
    throw Object.assign(new Error(), { code: "UNEXPECTED_DATABASE_TARGET" });
  }
  if (!local && allowLocal) throw Object.assign(new Error(), { code: "LOCAL_FLAG_WITH_REMOTE_DATABASE" });
  target.searchParams.set("schema", "public");
  const root = resolve(__dirname, "..");
  const migrationsPath = resolve(root, "prisma/migrations");
  const migrations = readdirSync(migrationsPath, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => {
    const source = readFileSync(resolve(migrationsPath, item.name, "migration.sql"), "utf8");
    const hashes = [source, source.replace(/\r\n/g, "\n"), source.replace(/\r?\n/g, "\r\n")].map((value) => createHash("sha256").update(value).digest("hex"));
    return { name: item.name, hashes };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const db = new PrismaClient({ datasourceUrl: target.toString() });
  try {
    const report = await db.$transaction(async (tx) => {
      // Toda consulta posterior queda protegida por PostgreSQL contra escrituras.
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const [identity] = await tx.$queryRawUnsafe("SELECT current_database() AS database, current_setting('server_version') AS version, current_setting('transaction_read_only') AS read_only");
      const tables = await tx.$queryRawUnsafe("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
      const apiGrants = await tx.$queryRawUnsafe("SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','PUBLIC') ORDER BY table_name,grantee,privilege_type");
      const columns = await tx.$queryRawUnsafe("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
      const constraints = await tx.$queryRawUnsafe("SELECT r.relname AS table_name,c.conname,c.contype,c.convalidated,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' ORDER BY r.relname,c.conname");
      const triggers = await tx.$queryRawUnsafe("SELECT r.relname AS table_name,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY r.relname,t.tgname");
      const indexes = await tx.$queryRawUnsafe("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname");
      const sequences = await tx.$queryRawUnsafe("SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename");
      const historyExists = tables.some((table) => table.tablename === "_prisma_migrations");
      const history = historyExists ? await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY started_at') : [];
      const applied = history.filter((migration) => migration.finished_at && !migration.rolled_back_at);
      const checksumConflicts = applied.filter((migration) => {
        const expected = migrations.find((item) => item.name === migration.migration_name);
        return expected && !expected.hashes.includes(migration.checksum);
      }).map((migration) => migration.migration_name);
      const pending = migrations.filter((migration) => !applied.some((item) => item.migration_name === migration.name)).map((migration) => migration.name);
      const incomplete = history.filter((migration) => !migration.finished_at && !migration.rolled_back_at).map((migration) => migration.migration_name);
      const initial = readFileSync(resolve(migrationsPath, migrations[0].name, "migration.sql"), "utf8");
      const requiredTables = [...initial.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);
      const missingBaselineTables = requiredTables.filter((name) => !tables.some((table) => table.tablename === name));
      let issues = null;
      let categoryDifferences = null;
      if (!missingBaselineTables.length) {
        const source = readFileSync(resolve(root, "prisma/preflight-integrity.sql"), "utf8");
        const query = source.slice(source.search(/^SELECT /m)).split(";")[0];
        issues = await tx.$queryRawUnsafe("SELECT issue,count(*)::int AS count FROM (" + query + ") preflight GROUP BY issue ORDER BY issue");
        categoryDifferences = await tx.$queryRawUnsafe('SELECT count(*)::int AS count FROM treatments t JOIN specialties s ON s.id=t."specialtyId" WHERE t.category IS DISTINCT FROM s.name');
      }
      return {
        checkedAt: new Date().toISOString(), target: { host: target.hostname, ...identity },
        requiresBaselineReview: !historyExists || !applied.length,
        pending, incomplete, checksumConflicts, missingBaselineTables, issues, categoryDifferences,
        history, tables, columns, constraints, triggers, indexes, sequences, apiGrants,
        note: "Solo lectura. No valida respaldo, restauración, permisos de Storage ni compatibilidad completa del despliegue.",
      };
    }, { maxWait: 10_000, timeout: 60_000 });
    console.log(JSON.stringify(report, null, 2));
    if (report.incomplete.length || report.checksumConflicts.length || report.missingBaselineTables.length || report.issues?.length || report.requiresBaselineReview) process.exitCode = 2;
  } finally { await db.$disconnect(); }
}

main().catch((error) => {
  // No imprimir errores del proveedor: pueden incluir cadenas de conexión.
  console.error("Comprobación detenida:", error.code || error.name || "UNKNOWN_ERROR");
  process.exitCode = 1;
});
