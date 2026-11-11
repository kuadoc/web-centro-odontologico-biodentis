import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { PageSessionService } from "@/modules/auth/page-session.service";

const sessions = new PageSessionService();

/** Se ejecuta en cada página, también durante la navegación con el router. */
export async function requirePageAccess(pathname: string) {
  const token = (await cookies()).get("refresh_token")?.value;
  try {
    return await sessions.authorize(token, pathname);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
    if (error instanceof AuthorizationError) redirect("/appointments");
    throw error;
  }
}
