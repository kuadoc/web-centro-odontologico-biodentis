import bcrypt from "bcrypt";
import { ProfileRepository } from "./profile.repository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { hashToken } from "@/lib/auth";
import { StorageService } from "@/modules/storage/storage.service";
import {
  UpdateProfileSchema,
  UpdatePasswordSchema,
  UpdateDentistProfileSchema,
} from "@biodentis/shared-validators";

const profileRepository = new ProfileRepository();

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** "" del formulario significa "limpiar el campo" -> null en BD. */
function normalize<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    out[key] = value === "" ? null : value;
  }
  return out as T;
}

function minutesBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number) as [number, number];
  const [eh, em] = endTime.split(":").map(Number) as [number, number];
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export class ProfileService {
  /** Perfil completo del usuario autenticado: datos personales, ficha profesional y horario real. */
  async getMyProfile(userId: string) {
    const user = await profileRepository.findUser(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;

    const dentist = await profileRepository.findDentistByUserId(userId);
    if (!dentist) {
      return { user: safeUser, dentist: null, schedule: [], weeklyHours: 0, upcomingException: null };
    }

    const [availability, upcomingException] = await Promise.all([
      profileRepository.findAvailability(dentist.id),
      profileRepository.findNextException(dentist.id, new Date()),
    ]);

    const unitName = dentist.assignedUnit?.name ?? null;
    let totalMinutes = 0;

    // Semana laboral en orden Lunes..Domingo (dayOfWeek 0 = Domingo en Date.getDay()).
    const schedule = [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
      const blocks = availability.filter((a) => a.dayOfWeek === dayOfWeek);
      const minutes = blocks.reduce((acc, b) => acc + minutesBetween(b.startTime, b.endTime), 0);
      totalMinutes += minutes;
      const first = blocks[0];
      const last = blocks[blocks.length - 1];
      return {
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek] as string,
        startTime: first?.startTime ?? null,
        endTime: last?.endTime ?? null,
        unitName: blocks.length > 0 ? unitName : null,
        available: blocks.length > 0,
        hours: Math.round((minutes / 60) * 10) / 10,
      };
    });

    return {
      user: safeUser,
      dentist: {
        id: dentist.id,
        specialty: dentist.specialty,
        licenseNumber: dentist.licenseNumber,
        university: dentist.university,
        shiftLabel: dentist.shiftLabel,
        assignedUnit: dentist.assignedUnit,
      },
      schedule,
      weeklyHours: Math.round((totalMinutes / 60) * 10) / 10,
      upcomingException,
    };
  }

  /** Actualiza los datos de contacto que el propio usuario puede editar. */
  async updateMyProfile(userId: string, input: unknown) {
    const parsed = UpdateProfileSchema.parse(input);
    const apply = async (repository: ProfileRepository) => {
      const user = await repository.findUser(userId);
      if (!user) throw new NotFoundError("Usuario no encontrado");

      const updated = await new StorageService().conFotoPerfil(parsed.avatarUrl, userId, user.role === "DENTIST", (avatarUrl) =>
        repository.updateUser(userId, normalize({ ...parsed, avatarUrl })), user.avatarUrl,
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...safeUser } = updated;
      return safeUser;
    };
    return parsed.avatarUrl === undefined ? apply(profileRepository) : profileRepository.withLockedUser(userId, apply);
  }

  /**
   * Campos profesionales (especialidad, colegiatura, box asignado).
   * Los gestiona Direccion Medica: la ruta que lo invoque debe exigir rol ADMIN.
   */
  async updateDentistProfile(targetUserId: string, input: unknown) {
    const parsed = UpdateDentistProfileSchema.parse(input);
    const dentist = await profileRepository.findDentistByUserId(targetUserId);
    if (!dentist) throw new NotFoundError("Ficha de odontólogo no encontrada");
    return profileRepository.updateDentist(dentist.id, normalize(parsed));
  }

  async changePassword(userId: string, input: unknown) {
    const parsed = UpdatePasswordSchema.parse(input);
    const user = await profileRepository.findUser(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");

    const valid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError("Contraseña actual incorrecta");

    const passwordHash = await bcrypt.hash(parsed.newPassword, 10);
    const revoked = await profileRepository.changePassword(userId, passwordHash);
    return { success: true, revokedSessions: revoked };
  }

  /** Sesiones activas (refresh tokens vigentes); marca cual es la del navegador actual. */
  async getMySessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const sessions = await profileRepository.findActiveSessions(userId, new Date());
    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      current: currentHash !== null && s.tokenHash === currentHash,
    }));
  }

  /** Cierra las demas sesiones, conservando la del navegador actual. */
  async revokeOtherSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const revoked = await profileRepository.revokeSessionsExcept(userId, currentHash);
    return { success: true, revokedSessions: revoked };
  }

  async revokeSession(userId: string, sessionId: string) {
    const count = await profileRepository.revokeSessionById(userId, sessionId);
    if (count === 0) throw new NotFoundError("Sesión no encontrada");
    return { success: true };
  }
}
