import { Role } from "@biodentis/shared-types";

const ALL_ROLES = [Role.ADMIN, Role.RECEPTIONIST, Role.DENTIST, Role.PATIENT];
const STAFF_ROLES = [Role.ADMIN, Role.RECEPTIONIST, Role.DENTIST];

/** Permisos de navegación, alineados con los endpoints de cada sección. */
export const ROUTE_ROLES: Readonly<Record<string, readonly Role[]>> = {
  "/dashboard": STAFF_ROLES,
  "/appointments": ALL_ROLES,
  "/patients": STAFF_ROLES,
  "/dentists": [Role.ADMIN],
  "/clinical-records": [Role.ADMIN, Role.DENTIST, Role.PATIENT],
  "/users": [Role.ADMIN],
  "/reports/reassignments": [Role.ADMIN],
  "/config": [Role.ADMIN],
  "/profile": ALL_ROLES,
};

export function isProtectedPath(pathname: string): boolean {
  return Object.keys(ROUTE_ROLES).some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Deniega rutas desconocidas y comprueba límites de segmento. */
export function canAccessRoute(role: Role | undefined, pathname: string): boolean {
  if (!role) return false;
  return Object.entries(ROUTE_ROLES).some(
    ([path, roles]) =>
      (pathname === path || pathname.startsWith(`${path}/`)) && roles.includes(role),
  );
}

export function getDefaultRoute(role: Role): string {
  return role === Role.PATIENT ? "/appointments" : "/dashboard";
}
