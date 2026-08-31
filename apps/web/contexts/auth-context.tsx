"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";

type AuthReturnType = ReturnType<typeof useAuth>;
type ApiReturnType = ReturnType<typeof useApi>;

interface AuthContextType extends AuthReturnType {
  api: ApiReturnType;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const api = useApi();

  return (
    <AuthContext.Provider value={{ ...auth, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
