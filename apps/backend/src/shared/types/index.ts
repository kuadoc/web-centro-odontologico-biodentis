import { Request } from "express";
import { UserPayload } from "@biodentis/shared-types";

export interface AuthRequest extends Request {
  user?: UserPayload;
}
