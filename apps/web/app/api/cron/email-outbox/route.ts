import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { cronSecret } from "@/lib/env";
import { ReminderService } from "@/modules/appointments/reminder.service";
import { handleApiError } from "@/lib/errors";

/** GET /api/cron/email-outbox — trabajador autenticado de avisos persistidos. */
export async function GET(request: NextRequest) {
  const secret = cronSecret();
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || received.length !== expected.length || !timingSafeEqual(received, expected)) return Response.json({ error: "No autorizado" }, { status: 401 });
  try { return Response.json(await new ReminderService().run(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return handleApiError(error); }
}
