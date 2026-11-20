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
import { normalizeRegistrationPhone } from "@/lib/registration-form";
import styles from "@/components/auth/auth.module.css";

// Deja solo letras (con tildes, ñ y ü) y espacios.
const onlyLetters = (value: string) =>
  value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, "");

// Deja solo dígitos y corta a un máximo de 8 (largo del DNI peruano).
const onlyDniDigits = (value: string) =>
  value.replace(/\D/g, "").slice(0, 8);

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", dni: "", phone: "" });
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
            <Input id="firstName" name="firstName" autoComplete="given-name" placeholder="Ej. María José" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: onlyLetters(event.target.value) })} disabled={isLoading} required />
          </div>
          <div className={styles.field}>
            <Label htmlFor="lastName">Apellidos</Label>
            <Input id="lastName" name="lastName" autoComplete="family-name" placeholder="Ej. Castillo Rivas" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: onlyLetters(event.target.value) })} disabled={isLoading} required />
          </div>
        </div>
        <div className={styles.field}>
          <Label htmlFor="dni">DNI</Label>
          <Input id="dni" name="dni" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" title="El DNI debe tener 8 dígitos" autoComplete="off" placeholder="Ej. 12345678" value={form.dni} onChange={(event) => setForm({ ...form, dni: onlyDniDigits(event.target.value) })} aria-describedby="dni-hint" disabled={isLoading} required />
        </div>
        <div className={styles.field}>
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="tu@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} disabled={isLoading} required />
        </div>
        <div className={styles.field}>
          <Label htmlFor="phone">Teléfono <span className={styles.optional}>(opcional)</span></Label>
          <Input id="phone" name="phone" type="tel" inputMode="numeric" pattern="[0-9]{9}" title="Ingresa un teléfono de 9 dígitos; puedes pegarlo con el prefijo +51" autoComplete="tel" placeholder="Ej. 987654321" value={form.phone} onChange={(event) => setForm({ ...form, phone: normalizeRegistrationPhone(event.target.value) })} disabled={isLoading} />
        </div>
        <div className={styles.field}>
          <Label htmlFor="password">Contraseña</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="Crea una contraseña de al menos 8 caracteres" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} aria-describedby="password-hint" disabled={isLoading} required />
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
