BEGIN;

-- El SQL previo creó este identificador sin comillas; alinearlo con Prisma.
ALTER INDEX IF EXISTS public.scheduled_job_runs_job_startedat_idx
  RENAME TO "scheduled_job_runs_job_startedAt_idx";

-- La API pública de Supabase no debe exponer el estado interno de autenticación
-- ni las colas y ejecuciones de notificaciones. Prisma opera con el rol servidor.
ALTER TABLE public.auth_throttles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_throttles, public.email_outbox, public.scheduled_job_runs FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.patient_code_seq FROM PUBLIC;

-- En PostgreSQL local estos roles pueden no existir; no se crean roles ni políticas.
DO $$
DECLARE api_role text;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.auth_throttles, public.email_outbox, public.scheduled_job_runs FROM %I', api_role);
    EXECUTE format('REVOKE ALL ON SEQUENCE public.patient_code_seq FROM %I', api_role);
  END LOOP;
END $$;

COMMIT;
