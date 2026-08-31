import jwt from "jsonwebtoken";
import { TokenService } from "../domain/TokenService";
import { UserPayload } from "@biodentis/shared-types";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || "15m";
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || "7d";

export class JwtTokenService implements TokenService {
  generateAccessToken(payload: UserPayload): string {
    return jwt.sign(payload as object, JWT_ACCESS_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRATION as any,
    });
  }

  generateRefreshToken(payload: UserPayload): string {
    return jwt.sign(payload as object, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRATION as any,
    });
  }

  verifyRefreshToken(token: string): UserPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as UserPayload;
    } catch {
      return null;
    }
  }
}
