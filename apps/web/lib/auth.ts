import jwt from "jsonwebtoken";
import crypto from "crypto";
import { NextResponse } from "next/server";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface AccessTokenPayload {
  sub: string;
  jti: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function generateAccessToken(userId: string): string {
  const jti = crypto.randomUUID();
  return jwt.sign({ sub: userId, jti }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId, jti }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

export function setRefreshTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}

export function clearRefreshTokenCookie(response: NextResponse): NextResponse {
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
  });
  return response;
}

export function getRefreshTokenFromCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.split("; ").find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
  return match ? match.split("=").slice(1).join("=") : undefined;
}
