"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/layout/sidebar-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useProfile } from "@/hooks/use-queries";
import {
  Calendar,
  Users,
  Stethoscope,
  FileText,
  LayoutDashboard,
  LogOut,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "RECEPTIONIST", "DENTIST", "PATIENT"] },
  { href: "/appointments", label: "Citas", icon: Calendar, roles: ["ADMIN", "RECEPTIONIST", "DENTIST", "PATIENT"] },
  { href: "/patients", label: "Pacientes", icon: Users, roles: ["ADMIN", "RECEPTIONIST", "DENTIST"] },
  { href: "/dentists", label: "Odontólogos", icon: Stethoscope, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/clinical-records", label: "Historial Clínico", icon: FileText, roles: ["ADMIN", "DENTIST", "PATIENT"] },
  { href: "/users", label: "Usuarios", icon: Shield, roles: ["ADMIN"] },
  { href: "/config", label: "Configuración", icon: Settings, roles: ["ADMIN"] },
  { href: "/profile", label: "Mi Perfil", icon: User, roles: ["ADMIN", "RECEPTIONIST", "DENTIST", "PATIENT"] },
];

function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isCollapsed } = useSidebar();
  const { data: profile } = useProfile();
  const filteredNav = navItems.filter((item) => user?.role && item.roles.includes(user.role));

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isCollapsed && "justify-center px-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t p-4", isCollapsed && "px-2")}>
        {user && (
          <div className={cn("mb-2 flex items-center gap-2", isCollapsed && "justify-center")}>
            <UserAvatar
              firstName={profile?.firstName ?? user.firstName}
              lastName={profile?.lastName ?? user.lastName}
              avatarUrl={profile?.avatarUrl}
              size="sm"
            />
            {!isCollapsed && (
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.role}</p>
              </div>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size={isCollapsed ? "icon" : "sm"}
          className={cn("w-full", isCollapsed && "h-8 w-8")}
          onPress={logout}
          aria-label="Cerrar sesión"
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Cerrar sesión"}
        </Button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { isMobileOpen, setMobileOpen, isCollapsed, toggleCollapsed } = useSidebar();
  const drawerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) closeMobile();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileOpen, closeMobile]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = startX.current - (e.changedTouches[0]?.clientX ?? 0);
    if (diff > 80) closeMobile();
  }, [closeMobile]);

  const sidebarWidth = isCollapsed ? "w-16" : "w-64";

  return (
    <>
      {/* Desktop sidebar (tablet compact / laptop+ expanded) */}
      <aside
        className={cn(
          // `h-screen sticky` en vez de `h-full`: el padre es `min-h-screen` sin
          // altura explícita, así que `h-full` colapsaba la barra a media página.
          // `shrink-0` evita que el contenido la comprima.
          "hidden lg:flex sticky top-0 h-screen shrink-0 flex-col border-r bg-card transition-all duration-200 ease-in-out",
          sidebarWidth
        )}
      >
        <div className={cn("flex h-14 items-center border-b", isCollapsed ? "justify-center px-2" : "px-4")}>
          {isCollapsed ? (
            <span className="font-semibold text-lg">B</span>
          ) : (
            <Link href="/" className="font-semibold text-lg">
              BIODENTIS
            </Link>
          )}
        </div>

        <SidebarNav />

        <div className={cn("border-t p-2 flex justify-center", isCollapsed ? "py-3" : "px-4 py-2")}>
          <Button
            variant="ghost"
            size={isCollapsed ? "icon-xs" : "icon-sm"}
            onPress={toggleCollapsed}
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[80vw] flex-col border-r bg-card transition-transform duration-200 ease-in-out lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <span className="font-semibold text-lg">BIODENTIS</span>
          <Button variant="ghost" size="icon-sm" onPress={closeMobile} aria-label="Cerrar menú">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <SidebarNav onNavClick={closeMobile} />
      </aside>
    </>
  );
}
