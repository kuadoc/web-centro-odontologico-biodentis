import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ForgotPasswordSchema } from "@biodentis/shared-validators";
import { handleApiError } from "@/lib/errors";
import { RateLimiter } from "@/lib/rate-limit";
import { hashToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email/send-emails";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const resetLimiter = new RateLimiter(3, FIFTEEN_MINUTES_MS);

const RESET_TOKEN_EXPIRY_MINUTES = 30;

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

    const rateLimitKey = `reset:${normalizedEmail}`;
    if (resetLimiter.isBlocked(rateLimitKey)) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    resetLimiter.increment(rateLimitKey);

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    sendPasswordResetEmail(user.email, user.firstName, rawToken).catch((error) => {
      console.error("[FORGOT_PASSWORD_EMAIL_FAILED]", { email: normalizedEmail, error });
    });

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
