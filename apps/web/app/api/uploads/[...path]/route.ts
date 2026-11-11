import { NextRequest } from "next/server";
import { StorageService } from "@/modules/storage/storage.service";
import { authenticate } from "@/lib/middleware";
import { handleApiError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/uploads/[...path] — fotos públicas o avatares del propietario/ADMIN. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const clave = path.join("/");
    const storage = new StorageService();
    const actorId = storage.requiereSesion(clave) ? (await authenticate(request)).sub : undefined;
    const imagen = await storage.leerImagen(clave, actorId);
    const headers = new Headers({
      "Content-Type": "image/webp",
      "Content-Length": String(imagen.contenido.byteLength),
      "Cache-Control": imagen.cacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    if (imagen.privada) headers.set("Vary", "Authorization");
    return new Response(Uint8Array.from(imagen.contenido), { headers });
  } catch (error) {
    const response = handleApiError(error);
    // Nunca cachear errores de autenticación, validación o archivos ausentes.
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }
}
