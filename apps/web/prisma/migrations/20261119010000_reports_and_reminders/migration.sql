BEGIN;
ALTER TABLE email_outbox ADD COLUMN outcome TEXT;
ALTER TABLE email_outbox DROP CONSTRAINT email_outbox_kind_check;
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_kind_check CHECK (
  kind IN ('BOOKING', 'CONFIRMATION', 'CANCELLATION') OR kind ~ '^REMINDER:[0-9]{4}-[0-9]{2}-[0-9]{2}:[0-9]{2}:[0-9]{2}$'
);
CREATE TABLE scheduled_job_runs (
  id TEXT PRIMARY KEY, job TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3), success BOOLEAN, processed INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX scheduled_job_runs_job_startedAt_idx ON scheduled_job_runs(job, "startedAt");
COMMIT;
