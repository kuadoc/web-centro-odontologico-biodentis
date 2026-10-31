"use client";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const patientDashboard = user?.role === "PATIENT" && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"));

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && patientDashboard) {
      router.replace("/appointments");
    }
  }, [user, isLoading, patientDashboard, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!user || patientDashboard) return null;

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
