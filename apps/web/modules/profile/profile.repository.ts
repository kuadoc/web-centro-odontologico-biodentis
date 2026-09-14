import { prisma } from "@/lib/prisma";

/**
 * Acceso a datos del perfil propio del usuario autenticado ("Mi Perfil").
 * Agrupa usuario + ficha de odontologo + disponibilidad + sesiones activas.
 */
export class ProfileRepository {
  async findUser(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  async updateUser(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      secondaryPhone?: string | null;
      address?: string | null;
      avatarUrl?: string | null;
    }
  ) {
    return prisma.user.update({ where: { id: userId }, data });
  }

  async findDentistByUserId(userId: string) {
    return prisma.dentist.findUnique({
      where: { userId },
      include: { assignedUnit: { select: { id: true, name: true } } },
    });
  }

  async updateDentist(
    dentistId: string,
    data: {
      specialty?: string;
      licenseNumber?: string | null;
      university?: string | null;
      shiftLabel?: string | null;
      assignedUnitId?: string | null;
    }
  ) {
    return prisma.dentist.update({
      where: { id: dentistId },
      data,
      include: { assignedUnit: { select: { id: true, name: true } } },
    });
  }

  async findAvailability(dentistId: string) {
    return prisma.availability.findMany({
      where: { dentistId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  async findNextException(dentistId: string, from: Date) {
    return prisma.scheduleException.findFirst({
      where: { dentistId, endDate: { gte: from }, status: { not: "CANCELLED" } },
      orderBy: { startDate: "asc" },
    });
  }

  async findActiveSessions(userId: string, now: Date) {
    return prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, tokenHash: true, deviceInfo: true, createdAt: true, expiresAt: true },
    });
  }

  async revokeSessionsExcept(userId: string, keepTokenHash: string | null) {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepTokenHash ? { tokenHash: { not: keepTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async revokeSessionById(userId: string, sessionId: string) {
    const result = await prisma.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}
