/* Operaciones explícitas contra la BD local; nunca contra producción. */
/* global require, process */
/* eslint-disable @typescript-eslint/no-require-imports -- Script operativo CommonJS ejecutado directamente por Node. */
const { execFileSync } = require("node:child_process");
const { mkdirSync, existsSync, writeFileSync, readFileSync } = require("node:fs");
const { randomBytes } = require("node:crypto");
const { resolve } = require("node:path");
const { PrismaClient } = require("@prisma/client");

const url = new URL(process.env.DATABASE_URL || "http://invalid");
const localTestAction = process.argv[2] === "test" && url.pathname === "/postgres";
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "5432" || (url.pathname !== "/biodentis" && !localTestAction)) {
  throw new Error("Las operaciones históricas requieren biodentis local; test admite también postgres en localhost:5432.");
}
const container = "next-monorepo-postgres-1";
const user = decodeURIComponent(url.username);
const backupDir = resolve("../../.backups");
const dump = resolve(backupDir, "biodentis-before-acid-20261119.dump");
const copy = "biodentis_acid_review_20261119";
const restoreCopy = "biodentis_acid_restore_verified_20261119";
function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function sql(database, statement) {
  return docker(["exec", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database, "-c", statement]);
}
async function main() {
  const action = process.argv[2];
  if (action === "backup") {
    mkdirSync(backupDir, { recursive: true });
    if (existsSync(dump)) throw new Error("El respaldo ya existe; no se sobrescribe.");
    docker(["exec", container, "pg_dump", "-U", user, "-d", "biodentis", "-Fc", "-f", "/tmp/biodentis-before-acid-20261119.dump"]);
    docker(["cp", `${container}:/tmp/biodentis-before-acid-20261119.dump`, dump]);
    docker(["exec", container, "pg_restore", "--list", "/tmp/biodentis-before-acid-20261119.dump"]);
    console.log("Respaldo local creado y catálogo del archivo verificado.");
  } else if (action === "restore-check") {
    if (!existsSync(dump)) throw new Error("Falta el respaldo.");
    docker(["exec", container, "createdb", "-U", user, restoreCopy]);
    docker(["cp", dump, `${container}:/tmp/biodentis-before-acid-20261119.dump`]);
    docker(["exec", container, "pg_restore", "-U", user, "-d", restoreCopy, "--exit-on-error", "/tmp/biodentis-before-acid-20261119.dump"]);
    console.log("Restauración completa verificada en " + restoreCopy);
    console.log(sql(restoreCopy, "SELECT count(*) AS tables FROM pg_tables WHERE schemaname='public'"));
  } else if (action === "inspect-conflicts") {
    const db = new PrismaClient();
    try {
      const overlaps = await db.$queryRawUnsafe(`SELECT a.id AS first_id,b.id AS second_id,a.date,a."startTime" AS first_start,a."endTime" AS first_end,b."startTime" AS second_start,b."endTime" AS second_end,a.status AS first_status,b.status AS second_status FROM appointments a JOIN appointments b ON a.id<b.id AND a."dentistId"=b."dentistId" AND a.date=b.date AND a.status<>'CANCELLED' AND b.status<>'CANCELLED' AND a."startTime"<b."endTime" AND b."startTime"<a."endTime"`);
      const phones = await db.$queryRawUnsafe(`SELECT id,length(phone)::int AS length,length(regexp_replace(phone,'[^0-9]','','g'))::int AS digits FROM users WHERE phone IS NOT NULL AND phone<>'' AND (length(phone)>25 OR phone !~ '^[+()0-9[:space:]-]+$' OR length(regexp_replace(phone,'[^0-9]','','g'))<6)`);
      // Solo identificadores operativos, sin nombres, correos ni teléfonos.
      writeFileSync(resolve(backupDir, "conflicts.json"), JSON.stringify({ overlaps, phones }, null, 2));
      console.log(JSON.stringify({ overlaps, phones }));
    } finally { await db.$disconnect(); }
  } else if (action === "reference-check") {
    const reference = "biodentis_acid_reference_20261119";
    docker(["exec", container, "createdb", "-U", user, reference]);
    docker(["cp", resolve("prisma/migrations/20261111000000_init/migration.sql"), `${container}:/tmp/biodentis-initial.sql`]);
    docker(["exec", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", reference, "-f", "/tmp/biodentis-initial.sql"]);
    const referenceUrl = new URL(url);
    referenceUrl.pathname = "/" + reference;
    const diff = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-url", referenceUrl.toString(), "--to-url", url.toString(), "--script"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    writeFileSync(resolve(backupDir, "initial-baseline-diff.sql"), diff);
    console.log(diff);
  } else if (action === "verify-restore") {
    const restoredUrl = new URL(url);
    restoredUrl.pathname = "/" + restoreCopy;
    const original = new PrismaClient();
    const restored = new PrismaClient({ datasourceUrl: restoredUrl.toString() });
    try {
      const tables = await original.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
      for (const { tablename } of tables) {
        const identifier = '"' + tablename.replaceAll('"', '""') + '"';
        const query = `SELECT count(*)::int AS count, md5(COALESCE(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) AS checksum FROM ${identifier} t`;
        const source = await original.$queryRawUnsafe(query);
        const destination = await restored.$queryRawUnsafe(query);
        if (JSON.stringify(source) !== JSON.stringify(destination)) throw new Error("La restauración difiere en " + tablename);
      }
      console.log("Restauración verificada: conteos y checksums coinciden en " + tables.length + " tablas.");
    } finally { await original.$disconnect(); await restored.$disconnect(); }
  } else if (action === "apply") {
    if (!existsSync(dump)) throw new Error("Falta el respaldo previo.");
    const applyUrl = new URL(url);
    if (process.argv[3] === "review") applyUrl.pathname = "/" + copy;
    else if (process.argv[3]) throw new Error("Destino no permitido.");
    const db = new PrismaClient({ datasourceUrl: applyUrl.toString() });
    try {
      const source = readFileSync("prisma/preflight-integrity.sql", "utf8");
      const query = source.slice(source.search(/^SELECT /m)).split(";")[0];
      const problems = await db.$queryRawUnsafe("SELECT issue,count(*)::int AS count FROM (" + query + ") x GROUP BY issue ORDER BY issue");
      if (problems.length) {
        console.log("Aplicación detenida antes de escribir: " + JSON.stringify(problems));
        throw Object.assign(new Error("Resolver datos antes de migrar"), { code: "DATA_REVIEW_REQUIRED" });
      }
      const baseline = await db.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations')::text AS name");
      const env = { ...process.env, DATABASE_URL: applyUrl.toString(), DIRECT_URL: applyUrl.toString() };
      const prisma = (args) => execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", ...args], { env, stdio: "inherit" });
      if (!baseline[0].name) {
        const referenceUrl = new URL(url);
        referenceUrl.pathname = "/biodentis_acid_reference_20261119";
        const diff = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-url", referenceUrl.toString(), "--to-url", applyUrl.toString(), "--script"], { env, encoding: "utf8" });
        const statements = diff.replace(/--[^\n]*/g, "").split(";").map((s) => s.trim()).filter(Boolean);
        const allowed = statements.every((s) => s === 'DROP INDEX "public"."appointments_dentistId_date_startTime_key"' || s === 'CREATE INDEX "appointments_dentistId_date_startTime_idx" ON "public"."appointments"("dentistId" ASC, "date" ASC, "startTime" ASC)');
        if (!allowed) throw new Error("Drift diferente al revisado; no se marca el baseline.");
        // Recuperar el índice inicial antes de reconocer esa migración como aplicada.
        await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "appointments_dentistId_date_startTime_key" ON appointments ("dentistId",date,"startTime")');
        prisma(["resolve", "--applied", "20261111000000_init"]);
      }
      prisma(["deploy"]);
      const updated = await db.$executeRawUnsafe('UPDATE treatments t SET category=s.name FROM specialties s WHERE s.id=t."specialtyId" AND t.category IS DISTINCT FROM s.name');
      console.log("Migraciones aplicadas. Categorías sincronizadas: " + updated);
    } finally { await db.$disconnect(); }
  } else if (action === "rehearse") {
    // Solo en la copia restaurada: demuestra la reconciliación completa sin alterar biodentis.
    const rehearsalUrl = new URL(url);
    rehearsalUrl.pathname = "/" + copy;
    const db = new PrismaClient({ datasourceUrl: rehearsalUrl.toString() });
    try {
      await db.$transaction(async (tx) => {
        const conflicts = JSON.parse(readFileSync(resolve(backupDir, "conflicts.json"), "utf8"));
        if (conflicts.overlaps.length !== 1 || conflicts.phones.length !== 1) throw new Error("Casos diferentes a los revisados.");
        const overlap = conflicts.overlaps[0];
        const pendingId = overlap.first_status === "PENDING" ? overlap.first_id : overlap.second_status === "PENDING" ? overlap.second_id : undefined;
        if (!pendingId) throw new Error("Falta la cita pendiente revisada.");
        const result = await tx.appointment.updateMany({ where: { id: pendingId, status: "PENDING" }, data: { status: "CANCELLED", cancellationReason: "Simulación de reconciliación en copia restaurada; no altera la cita original." } });
        if (result.count !== 1) throw new Error("La copia no corresponde al respaldo revisado.");
        await tx.$executeRaw`UPDATE users SET phone=regexp_replace(phone,'[^+()0-9[:space:]-]','','g') WHERE id=${conflicts.phones[0].id}`;
      });
    } finally { await db.$disconnect(); }
    execFileSync(process.execPath, ["--env-file=.env", "scripts/local-database-maintenance.cjs", "apply", "review"], { stdio: "inherit" });
  } else if (action === "status") {
    const targets = { local: url.toString() };
    const reviewUrl = new URL(url);
    reviewUrl.pathname = "/" + copy;
    targets.review = reviewUrl.toString();
    const testConnection = resolve(backupDir, "acid-test-connection.txt");
    if (existsSync(testConnection)) targets.test = readFileSync(testConnection, "utf8").trim();
    const report = {};
    for (const [name, datasourceUrl] of Object.entries(targets)) {
      const db = new PrismaClient({ datasourceUrl });
      try {
        report[name] = await db.$queryRawUnsafe(`SELECT current_database() AS database,
          (SELECT count(*)::int FROM pg_tables WHERE schemaname='public') AS tables,
          (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='c') AS checks,
          (SELECT count(*)::int FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='x') AS exclusions,
          (SELECT count(*)::int FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
          to_regclass('auth_throttles')::text AS auth_throttles,to_regclass('email_outbox')::text AS email_outbox,
          to_regclass('_prisma_migrations')::text AS migrations,to_regclass('patient_code_seq')::text AS patient_code_sequence`);
      } finally { await db.$disconnect(); }
    }
    writeFileSync(resolve(backupDir, "acid-status.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } else if (action === "test") {
    const testContainer = "biodentis-acid-tests-20261119";
    const connection = resolve(backupDir, "acid-test-connection.txt");
    let testUrl;
    if (existsSync(connection)) {
      testUrl = readFileSync(connection, "utf8").trim();
    } else {
      const password = randomBytes(24).toString("hex");
      docker(["run", "-d", "--name", testContainer, "-p", "127.0.0.1:55439:5432", "-e", "POSTGRES_USER=biodentis", "-e", "POSTGRES_PASSWORD=" + password, "-e", "POSTGRES_DB=biodentis_test_final", "postgres:16-alpine"]);
      testUrl = `postgresql://biodentis:${password}@localhost:55439/biodentis_test_final?schema=public`;
      writeFileSync(connection, testUrl);
    }
    for (let attempt = 0; attempt < 30; attempt++) {
      try { docker(["exec", testContainer, "pg_isready", "-U", "biodentis"]); break; }
      catch { if (attempt === 29) throw new Error("PostgreSQL de pruebas no inició."); await new Promise((done) => setTimeout(done, 500)); }
    }
    const env = { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl, RUN_LOCAL_DATABASE_TESTS: "1", EMAIL_MODE: "test", EMAIL_TEST_RECIPIENT: "", SMTP_PASSWORD: "" };
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "inherit" });
    const suite = process.argv[3] || "tests/integration/integrity-local-database.cts";
    execFileSync(process.execPath, ["--require", "tsx/cjs", "--test", suite], { env, stdio: "inherit" });
  } else throw new Error("Acción desconocida.");
}
main().catch((error) => { console.error("Mantenimiento local falló:", error.code || error.name); process.exitCode = 1; });
