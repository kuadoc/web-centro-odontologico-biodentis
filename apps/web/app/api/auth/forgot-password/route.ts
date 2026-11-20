import { PasswordResetRepository } from "@/modules/auth/password-reset.repository";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ForgotPasswordSchema } from "@biodentis/shared-validators";
import { handleApiError } from "@/lib/errors";
import { LoginThrottleService } from "@/modules/auth/login-throttle.service";
import { hashToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email/send-emails";
import { canSendEmail } from "@/lib/email/email-policy";

const resetLimiter = new LoginThrottleService();

const RESET_TOKEN_EXPIRY_MINUTES = 60;

const GENERIC_MESSAGE = "Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    if (!canSendEmail(normalizedEmail)) {
      return NextResponse.json({ message: "La recuperación por correo está temporalmente limitada a la cuenta de pruebas autorizada." }, { status: 200 });
    }

    if (!(await resetLimiter.allowPasswordReset(normalizedEmail))) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

    await new PasswordResetRepository().issue(user.id, tokenHash, expiresAt);

    await sendPasswordResetEmail(user.email, user.firstName, rawToken).catch((error) => {
      console.error("[FORGOT_PASSWORD_EMAIL_FAILED]", { email: normalizedEmail, error });
    });

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
