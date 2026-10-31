"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ThemeSelector } from "@/components/theme-selector";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useProfile } from "@/hooks/use-queries";
import { Menu } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ROLE_LABELS } from "@/lib/role-labels";

export function Header() {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebar();
  // La foto vive en el perfil, no en el token: se lee de la caché de react-query.
  const { data: profile } = useProfile();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-xl px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onPress={() => setMobileOpen(true)}
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold hidden sm:block">{user?.role === "PATIENT" ? "Portal del Paciente" : "Panel de Control"}</h1>
        <Link href={user?.role === "PATIENT" ? "/appointments" : "/dashboard"} className="sm:hidden" aria-label={user?.role === "PATIENT" ? "Biodentis, mis citas" : "Biodentis, panel de control"}><BrandLogo compact /></Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeSelector />
        <Badge variant="secondary" className="hidden sm:inline-flex">{user && ROLE_LABELS[user.role]}</Badge>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium leading-tight">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground leading-tight">{user?.email}</span>
          </div>
          <UserAvatar
            firstName={profile?.firstName ?? user?.firstName}
            lastName={profile?.lastName ?? user?.lastName}
            avatarUrl={profile?.avatarUrl}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}
