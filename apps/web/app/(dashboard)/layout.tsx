"use client";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { canAccessRoute, getDefaultRoute } from "@/lib/route-access";
import { Button } from "@workspace/ui/components/button";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, sessionError, retrySession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasAccess = canAccessRoute(user?.role, pathname);

  useEffect(() => {
    if (!isLoading && !sessionError && !user) {
      router.replace("/login");
    } else if (!isLoading && user && !hasAccess) {
      router.replace(getDefaultRoute(user.role));
    }
  }, [user, isLoading, sessionError, hasAccess, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (sessionError && !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert" className="text-muted-foreground">{sessionError}</p>
        <Button onPress={retrySession}>Reintentar</Button>
      </div>
    );
  }

  if (!user || !hasAccess) return null;

  return (
    // `min-w-0` en la columna de contenido es lo que impide que una tabla ancha
    // ensanche el flex item y empuje el layout fuera del viewport.
    <div className="flex min-h-screen w-full overflow-x-clip">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </SidebarProvider>
    </AuthProvider>
  );
}
