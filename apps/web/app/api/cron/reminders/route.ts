import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAppointmentReminder } from "@/lib/email/send-emails";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
        status: "CONFIRMED",
      },
      include: {
        patient: { select: { firstName: true, lastName: true, email: true } },
        dentist: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const appointment of appointments) {
      const patientEmail = appointment.patient.email;
      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
      const dentistName = `Dr. ${appointment.dentist.user.firstName} ${appointment.dentist.user.lastName}`;
      const date = new Date(appointment.date).toLocaleDateString("es-CL");
      const time = appointment.startTime;

      const sent = await sendAppointmentReminder(patientEmail, {
        patientName,
        dentistName,
        date,
        time,
      });

      if (sent) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    console.log(
      "[CRON_REMINDERS]",
      JSON.stringify({
        date: tomorrow.toISOString().split("T")[0],
        total: appointments.length,
        sent: sentCount,
        failed: failedCount,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      message: "Recordatorios procesados",
      total: appointments.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[CRON_REMINDERS_ERROR]", { error: message });
    return NextResponse.json({ error: "Error procesando recordatorios" }, { status: 500 });
  }
}
