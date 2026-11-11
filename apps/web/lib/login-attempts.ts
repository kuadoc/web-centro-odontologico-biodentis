interface FailedAttempt {
  email: string;
  ip: string;
  timestamp: Date;
  reason: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const failedAttempts = new Map<string, { count: number; expiresAt: number }>();

export function recordFailedAttempt(email: string, ip: string, reason: string) {
  const normalizedEmail = email.toLowerCase();
  const entry = failedAttempts.get(normalizedEmail);
  const now = Date.now();

  if (entry && now >= entry.expiresAt) {
    failedAttempts.delete(normalizedEmail);
  }

  const current = failedAttempts.get(normalizedEmail) || { count: 0, expiresAt: now + LOCKOUT_MINUTES * 60 * 1000 };
  current.count++;
  // Los fallos se acumulan en una ventana de 15 min; el quinto inicia el bloqueo.
  if (current.count === MAX_FAILED_ATTEMPTS) {
    current.expiresAt = now + LOCKOUT_MINUTES * 60 * 1000;
  }
  failedAttempts.set(normalizedEmail, current);

  const logEntry: FailedAttempt = {
    email: normalizedEmail,
    ip,
    timestamp: new Date(),
    reason,
  };
  console.warn("[AUTH_FAILED]", JSON.stringify(logEntry));

  return current.count >= MAX_FAILED_ATTEMPTS;
}

export function isAccountLocked(email: string): { locked: boolean; remainingMs: number } {
  const normalizedEmail = email.toLowerCase();
  const entry = failedAttempts.get(normalizedEmail);

  if (!entry) return { locked: false, remainingMs: 0 };

  const now = Date.now();
  if (now >= entry.expiresAt) {
    failedAttempts.delete(normalizedEmail);
    return { locked: false, remainingMs: 0 };
  }

  if (entry.count < MAX_FAILED_ATTEMPTS) return { locked: false, remainingMs: 0 };
  return { locked: true, remainingMs: entry.expiresAt - now };
}

export function clearFailedAttempts(email: string) {
  failedAttempts.delete(email.toLowerCase());
}
