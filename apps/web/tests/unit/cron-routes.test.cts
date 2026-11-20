import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET as current } from "@/app/api/cron/email-outbox/route";
import { GET as legacy } from "@/app/api/cron/reminders/route";
import { ReminderService } from "@/modules/appointments/reminder.service";

test("cron: rechaza secretos ausentes e inválidos y usa el mismo trabajador en ambos endpoints", async (context) => {
  const previous = process.env.CRON_SECRET;
  context.after(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
  const run = context.mock.method(ReminderService.prototype, "run", async () => ({ scheduled: 2, processed: 1, failed: 0 }));
  for (const handler of [current, legacy]) {
    delete process.env.CRON_SECRET;
    assert.equal((await handler(new NextRequest("http://localhost/api/cron", { headers: { authorization: "Bearer undefined" } }))).status, 401);
    process.env.CRON_SECRET = "test-cron-only";
    assert.equal((await handler(new NextRequest("http://localhost/api/cron"))).status, 401);
    assert.equal((await handler(new NextRequest("http://localhost/api/cron", { headers: { authorization: "Bearer invalid" } }))).status, 401);
  }
  assert.equal(run.mock.callCount(), 0);
  for (const handler of [current, legacy]) {
    const response = await handler(new NextRequest("http://localhost/api/cron", { headers: { authorization: "Bearer test-cron-only" } }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { scheduled: 2, processed: 1, failed: 0 });
  }
  assert.equal(run.mock.callCount(), 2);
});
