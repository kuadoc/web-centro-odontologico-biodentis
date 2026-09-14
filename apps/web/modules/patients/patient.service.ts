import bcrypt from "bcrypt";
import { PatientRepository, type PatientListFilter } from "./patient.repository";
import { AuditService } from "@/modules/audit/audit.service";
import { nextPatientCode } from "@/lib/patient-code";
import { prisma } from "@/lib/prisma";
import { NotFoundError, DomainError } from "@/lib/errors";
import { CreatePatientSchema, UpdatePatientSchema } from "@biodentis/shared-validators";

const patientRepository = new PatientRepository();
const auditService = new AuditService();

type PatientRow = Awaited<ReturnType<PatientRepository["findMany"]>>["items"][number];

/** Aplana el `_count` de Prisma a un campo plano que la tabla consume directo. */
function mapRow(patient: PatientRow) {
  const { _count, ...rest } = patient;
  return { ...rest, appointmentCount: _count.appointments };
}

export interface PatientScope {
  /** Definido solo para DENTIST: restringe al directorio de pacientes propios. */
  attendedByDentistId?: string;
}

export class PatientService {
  /** Directorio paginado. Filtros y paginacion se resuelven en la base, no en memoria. */
  async list(
    options: {
      search?: string;
      status?: string;
      appointments?: string;
      page?: number;
      pageSize?: number;
    } & PatientScope = {}
  ) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(Math.max(1, options.pageSize ?? 10), 100);

    const filter: PatientListFilter = {
      search: options.search,
      status: options.status === "active" || options.status === "inactive" ? options.status : undefined,
      appointments:
        options.appointments === "with" || options.appointments === "without"
          ? options.appointments
          : undefined,
      attendedByDentistId: options.attendedByDentistId,
      skip: (page - 1) * pageSize,
      take: pageSize,
    };

    const { items, total } = await patientRepository.findMany(filter);

    return {
      items: items.map(mapRow),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getStats(scope: PatientScope = {}) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return patientRepository.getStats(monthStart, scope.attendedByDentistId);
  }

  /**
   * Ficha administrativa: datos de contacto, metricas de actividad e historial
   * de agenda. Deliberadamente sin datos clinicos.
   */
  async getDetail(id: string, scope: PatientScope = {}) {
    const dentistId = scope.attendedByDentistId;

    const patient = await patientRepository.findById(id, dentistId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");

    const [statusCounts, history, lastAttended] = await Promise.all([
      patientRepository.countAppointmentsByStatus(id, dentistId),
      patientRepository.findAppointmentHistory(id, dentistId),
      patientRepository.findLastAttended(id, dentistId),
    ]);

    const counts: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };
    for (const row of statusCounts) counts[row.status] = row._count._all;

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    return {
      patient,
      activity: {
        totalAppointments: total,
        attended: counts.COMPLETED,
        cancelled: counts.CANCELLED,
        noShow: counts.NO_SHOW,
        upcoming: counts.PENDING! + counts.CONFIRMED!,
        lastAttendedAt: lastAttended?.date ?? null,
      },
      history: history.map((a) => ({
        id: a.id,
        date: a.date,
        startTime: a.startTime,
        status: a.status,
        dentistName: `${a.dentist.user.firstName} ${a.dentist.user.lastName}`,
        treatmentName: a.treatment?.name ?? null,
      })),
    };
  }

  async create(input: unknown, actorId: string) {
    const parsed = CreatePatientSchema.parse(input);

    const existing = await patientRepository.findByEmail(parsed.email);
    if (existing) throw new DomainError("El email ya está registrado", 409);

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const patient = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        role: "PATIENT",
        patientCode: await nextPatientCode(),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        address: parsed.address,
      },
      select: { id: true, email: true, firstName: true, lastName: true, patientCode: true },
    });

    await auditService.log(actorId, "CREATE_PATIENT", "User", patient.id, `Alta de ${patient.patientCode}`);
    return patient;
  }

  /**
   * Edicion de datos personales. El motivo de auditoria es OBLIGATORIO aqui
   * (el schema lo declara opcional porque se reutiliza en flujos internos).
   */
  async update(id: string, input: unknown, actorId: string) {
    const parsed = UpdatePatientSchema.parse(input);
    const { auditReason, ...data } = parsed;

    if (!auditReason || auditReason.trim().length < 15) {
      throw new DomainError("Se requiere un motivo de auditoría de al menos 15 caracteres");
    }

    const patient = await patientRepository.findById(id);
    if (!patient) throw new NotFoundError("Paciente no encontrado");

    if (data.email && data.email !== patient.email) {
      const taken = await patientRepository.findByEmail(data.email);
      if (taken) throw new DomainError("El email ya está registrado", 409);
    }

    const updated = await patientRepository.update(id, data);
    await auditService.log(actorId, "UPDATE_PATIENT", "User", id, auditReason.trim());
    return updated;
  }

  /** Activa o desactiva la cuenta. El historial de citas se conserva intacto. */
  async setActive(id: string, isActive: boolean, reason: string, actorId: string) {
    if (!reason || reason.trim().length < 5) {
      throw new DomainError("Se requiere indicar el motivo del cambio de estado");
    }

    const patient = await patientRepository.findById(id);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    if (patient.isActive === isActive) {
      throw new DomainError(`La cuenta ya está ${isActive ? "activa" : "desactivada"}`);
    }

    const updated = await patientRepository.update(id, { isActive });
    await auditService.log(
      actorId,
      isActive ? "ACTIVATE_PATIENT" : "DEACTIVATE_PATIENT",
      "User",
      id,
      reason.trim()
    );

    // Al desactivar se revocan sus sesiones: no debe poder seguir navegando.
    if (!isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return updated;
  }

  /** CSV del listado filtrado completo (no solo la pagina visible). */
  async exportCsv(
    options: { search?: string; status?: string; appointments?: string } & PatientScope = {}
  ) {
    const rows = await patientRepository.findAllForExport({
      search: options.search,
      status: options.status === "active" || options.status === "inactive" ? options.status : undefined,
      appointments:
        options.appointments === "with" || options.appointments === "without"
          ? options.appointments
          : undefined,
      attendedByDentistId: options.attendedByDentistId,
    });

    const headers = ["Codigo", "Nombres", "Apellidos", "Email", "Telefono", "Direccion", "Alta", "Citas", "Estado"];
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const lines = rows.map((p) =>
      [
        p.patientCode ?? "",
        p.firstName,
        p.lastName,
        p.email,
        p.phone ?? "",
        p.address ?? "",
        p.createdAt.toISOString().slice(0, 10),
        p._count.appointments,
        p.isActive ? "Activo" : "Inactivo",
      ]
        .map(escape)
        .join(",")
    );

    // BOM para que Excel respete los acentos.
    return "﻿" + [headers.map(escape).join(","), ...lines].join("\r\n");
  }
}
