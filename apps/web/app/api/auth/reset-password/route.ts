import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { ResetPasswordSchema } from "@biodentis/shared-validators";
import { handleApiError, DomainError } from "@/lib/errors";
import { hashToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.parse(body);

    const tokenHash = hashToken(parsed.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken) {
      throw new DomainError("Token inválido o expirado", 400);
    }

    if (resetToken.usedAt) {
      throw new DomainError("Token ya utilizado", 400);
    }

    if (new Date() > resetToken.expiresAt) {
      throw new DomainError("Token expirado", 400);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
