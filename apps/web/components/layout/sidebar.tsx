"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/layout/sidebar-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useProfile } from "@/hooks/use-queries";
import { ROLE_LABELS } from "@/lib/role-labels";
import { canAccessRoute } from "@/lib/route-access";
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
  History,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Panel de control", icon: LayoutDashboard },
  { href: "/appointments", label: "Citas", icon: Calendar },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/dentists", label: "Catálogo", icon: Stethoscope },
  { href: "/clinical-records", label: "Historial Clínico", icon: FileText },
  { href: "/users", label: "Usuarios", icon: Shield },
  { href: "/reports/reassignments", label: "Reporte de citas", icon: History },
  { href: "/config", label: "Configuración", icon: Settings },
  { href: "/profile", label: "Mi Perfil", icon: User },
];

function SidebarNav({ onNavClick, isCollapsed = false }: { onNavClick?: () => void; isCollapsed?: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();
  const filteredNav = navItems.filter((item) => canAccessRoute(user?.role, item.href));

  return (
    <>
      <nav aria-label="Navegación principal" className={cn("min-h-0 min-w-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3", isCollapsed && "p-2")}>
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex min-w-0 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isCollapsed && "justify-center px-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={isCollapsed ? item.label : undefined}
              aria-label={isCollapsed ? item.label : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="min-w-0 flex-1 leading-5 whitespace-normal [overflow-wrap:anywhere]">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("min-w-0 shrink-0 border-t p-4", isCollapsed && "flex flex-col items-center px-2")}>
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
                <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
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
          "sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] min-w-0 shrink-0 self-start flex-col overflow-hidden rounded-xl border bg-card transition-[width] duration-200 ease-in-out lg:flex",
          sidebarWidth
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b", isCollapsed ? "justify-center px-2" : "px-4")}>
          <Link href="/" aria-label="Biodentis, inicio"><BrandLogo compact={isCollapsed} /></Link>
        </div>

        <SidebarNav isCollapsed={isCollapsed} />

        <div className={cn("flex shrink-0 justify-center border-t p-2", isCollapsed ? "py-3" : "px-4 py-2")}>
          <Button
            variant="ghost"
            size={isCollapsed ? "icon-xs" : "icon-sm"}
            onPress={toggleCollapsed}
            aria-label={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
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
          "fixed inset-y-3 left-3 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border bg-card transition-transform duration-200 ease-in-out lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+0.75rem)]"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <Link href="/" onClick={closeMobile} aria-label="Biodentis, inicio"><BrandLogo /></Link>
          <Button variant="ghost" size="icon-sm" onPress={closeMobile} aria-label="Cerrar menú">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <SidebarNav onNavClick={closeMobile} />
      </aside>
    </>
  );
}
