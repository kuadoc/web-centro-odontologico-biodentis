import { UserPayload } from "@biodentis/shared-types";

export interface TokenService {
  generateAccessToken(payload: UserPayload): string;
  generateRefreshToken(payload: UserPayload): string;
  verifyRefreshToken(token: string): UserPayload | null;
}
