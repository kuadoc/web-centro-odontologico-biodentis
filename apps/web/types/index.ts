export interface AccessTokenPayload {
  sub: string;
  jti: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
