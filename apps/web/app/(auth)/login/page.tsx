"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { useAuth } from "@/hooks/use-auth";
import styles from "@/components/auth/auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setError("");
    setIsLoading(true);

    try {
      const signedInUser = await login(email, password);
      const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
      const allowedPath = callbackUrl?.split("?")[0];
      const isPatient = signedInUser.role === "PATIENT";
      const allowedPaths = isPatient
        ? ["/appointments", "/clinical-records", "/profile"]
        : ["/dashboard", "/appointments", "/clinical-records", "/profile", "/patients", "/dentists", "/users", "/config"];
      router.push(callbackUrl && allowedPaths.includes(allowedPath ?? "") ? callbackUrl : isPatient ? "/appointments" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className={styles.cardHeading}>
        <h1>Iniciar sesión</h1>
        <p>Ingresa con tu correo y contraseña para continuar.</p>
      </div>
      <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
        {error && <div id="login-error" className={styles.error} role="alert">{error}</div>}
        <div className={styles.field}>
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <div className={styles.field}>
          <div className={styles.passwordLabel}>
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <Button type="submit" size="lg" className={styles.submit} isDisabled={isLoading}>
          {isLoading && <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />}
          {isLoading ? "Ingresando..." : "Iniciar sesión"}
        </Button>
      </form>
      <p className={styles.switch}>¿Eres paciente y aún no tienes cuenta? <Link href="/register">Regístrate</Link></p>
    </AuthShell>
  );
}
