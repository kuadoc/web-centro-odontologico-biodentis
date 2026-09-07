"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface SidebarContextType {
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isMobileOpen, setMobileOpen, isCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}
