"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { useAuthContext } from "@/contexts/auth-context";
import {
  Calendar,
  Users,
  Stethoscope,
  FileText,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "RECEPTIONIST", "DENTIST", "PATIENT"] },
  { href: "/appointments", label: "Citas", icon: Calendar, roles: ["ADMIN", "RECEPTIONIST", "DENTIST", "PATIENT"] },
  { href: "/patients", label: "Pacientes", icon: Users, roles: ["ADMIN", "RECEPTIONIST", "DENTIST"] },
  { href: "/dentists", label: "Odontólogos", icon: Stethoscope, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/clinical-records", label: "Historial Clínico", icon: FileText, roles: ["ADMIN", "DENTIST", "PATIENT"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();

  const filteredNav = navItems.filter((item) => user?.role && item.roles.includes(user.role));

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="font-semibold text-lg">
          BIODENTIS
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-2 text-sm">
          <p className="font-medium">{user?.firstName} {user?.lastName}</p>
          <p className="text-muted-foreground text-xs">{user?.role}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
