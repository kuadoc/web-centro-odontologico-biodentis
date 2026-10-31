"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle, UserRound } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { useAuth } from "@/hooks/use-auth";
import styles from "@/components/auth/auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", phone: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setError("");
    setIsLoading(true);

    try {
      await register(form);
      router.push("/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell variant="register">
      <div className={styles.cardHeading}>
        <span className={styles.patientBadge}><UserRound size={12} />CUENTA DE PACIENTE</span>
        <h1>Crea tu cuenta</h1>
        <p>Regístrate para comenzar a cuidar tu sonrisa con nosotros.</p>
      </div>
      <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
        {error && <div id="register-error" className={styles.error} role="alert">{error}</div>}
        <div className={styles.nameFields}>
          <div className={styles.field}>
            <Label htmlFor="firstName">Nombres</Label>
            <Input id="firstName" name="firstName" autoComplete="given-name" placeholder="Tus nombres" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} disabled={isLoading} required />
          </div>
          <div className={styles.field}>
            <Label htmlFor="lastName">Apellidos</Label>
            <Input id="lastName" name="lastName" autoComplete="family-name" placeholder="Tus apellidos" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} disabled={isLoading} required />
          </div>
        </div>
        <div className={styles.field}>
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="tu@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} disabled={isLoading} required />
        </div>
        <div className={styles.field}>
          <Label htmlFor="phone">Teléfono <span className={styles.optional}>(opcional)</span></Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Tu número de contacto" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} disabled={isLoading} />
        </div>
        <div className={styles.field}>
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="Crea una contraseña" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} aria-describedby="password-hint" disabled={isLoading} required />
          <p id="password-hint" className={styles.hint}>Utiliza al menos 8 caracteres.</p>
        </div>
        <Button type="submit" size="lg" className={styles.submit} isDisabled={isLoading}>
          {isLoading && <LoaderCircle size={16} className={styles.spinner} aria-hidden="true" />}
          {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </form>
      <p className={styles.switch}>¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link></p>
    </AuthShell>
  );
}
