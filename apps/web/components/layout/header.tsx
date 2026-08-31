"use client";

import { useAuthContext } from "@/contexts/auth-context";
import { Badge } from "@workspace/ui/components/badge";
import { ThemeSelector } from "@/components/theme-selector";

export function Header() {
  const { user } = useAuthContext();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">Panel de Control</h1>
      <div className="flex items-center gap-3">
        <ThemeSelector />
        <Badge variant="secondary">{user?.role}</Badge>
        <span className="text-sm text-muted-foreground">{user?.email}</span>
      </div>
    </header>
  );
}
