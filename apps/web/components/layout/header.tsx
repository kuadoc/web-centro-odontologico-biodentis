"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ThemeSelector } from "@/components/theme-selector";
import { Menu, User } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebar();

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
        <h1 className="text-lg font-semibold hidden sm:block">Panel de Control</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeSelector />
        <Badge variant="secondary" className="hidden sm:inline-flex">{user?.role}</Badge>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium leading-tight">{user?.firstName} {user?.lastName}</span>
            <span className="text-xs text-muted-foreground leading-tight">{user?.email}</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
