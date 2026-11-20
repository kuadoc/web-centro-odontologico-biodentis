import { prisma } from "@/lib/prisma";

/** Contador atómico compartido entre instancias; nunca almacena correo/IP en claro. */
export class LoginThrottleRepository {
  async increment(key: string, windowMs: number) {
    const rows = await prisma.$queryRaw<Array<{ count: number; expiresAt: Date }>>`
      INSERT INTO auth_throttles (key, count, "expiresAt")
      VALUES (${key}, 1, CURRENT_TIMESTAMP + ${windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN auth_throttles."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE auth_throttles.count + 1 END,
        "expiresAt" = CASE WHEN auth_throttles."expiresAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."expiresAt" ELSE auth_throttles."expiresAt" END
      RETURNING count, "expiresAt"`;
    return rows[0]!;
  }
  clear(key: string) { return prisma.$executeRaw`DELETE FROM auth_throttles WHERE key = ${key}`; }
}
