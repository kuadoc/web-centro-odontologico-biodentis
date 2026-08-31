import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-destructive">403</h1>
        <p className="mt-2 text-muted-foreground">No tienes permiso para acceder a esta pagina</p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
