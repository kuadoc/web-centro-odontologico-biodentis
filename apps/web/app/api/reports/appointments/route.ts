import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/middleware";
import { Role } from "@biodentis/shared-types";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [Role.ADMIN, Role.RECEPTIONIST]);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const dentistId = searchParams.get("dentistId");

    const filters: Record<string, unknown> = {};
    if (from && to) {
      filters.date = { gte: new Date(from), lte: new Date(to) };
    }
    if (dentistId) {
      filters.dentistId = dentistId;
    }

    const appointments = await prisma.appointment.findMany({
      where: filters,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { date: "desc" },
    });

    const stats = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
      cancelled: appointments.filter((a) => a.status === "CANCELLED").length,
      noShow: appointments.filter((a) => a.status === "NO_SHOW").length,
    };

    return Response.json({ appointments, stats });
  } catch (error) {
    return handleApiError(error);
  }
}
