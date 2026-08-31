import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Role } from "@biodentis/shared-types";
import { cn } from "../../lib/utils";

const navItemsByRole: Record<Role, { label: string; path: string }[]> = {
  [Role.PATIENT]: [
    { label: "Solicitar Cita", path: "/appointments/new" },
    { label: "Mis Citas", path: "/appointments" },
    { label: "Mi Historial", path: "/clinical-history" },
  ],
  [Role.RECEPTIONIST]: [
    { label: "Agenda General", path: "/agenda" },
  ],
  [Role.DENTIST]: [
    { label: "Mi Agenda", path: "/my-agenda" },
    { label: "Historial Clinico", path: "/clinical-records" },
  ],
  [Role.ADMIN]: [
    { label: "Usuarios", path: "/admin/users" },
    { label: "Reportes", path: "/reports" },
  ],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = user ? navItemsByRole[user.role as Role] || [] : [];

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-muted/40">
        <div className="flex h-14 items-center border-b px-4">
          <Link to="/" className="text-lg font-semibold">
            BIODENTIS
          </Link>
        </div>
        <nav className="space-y-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                location.pathname === item.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-accent"
            >
              Cerrar Sesion
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
