"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Si la cuenta es elegible y el envío está disponible, recibirás instrucciones para restablecer tu contraseña.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data: unknown = await response.json();
      if (response.ok && typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        setMessage(data.message);
      } else {
        setMessage("No se pudo procesar la solicitud. Inténtalo nuevamente más tarde.");
      }

      setSubmitted(true);
    } catch {
      setMessage("No se pudo procesar la solicitud. Inténtalo nuevamente más tarde.");
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold"><Link href="/" aria-label="Biodentis, inicio"><BrandLogo /></Link></CardTitle>
            <CardDescription>Solicitud de recuperación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
              {message}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Si recibes un correo, sigue sus instrucciones para continuar.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold"><Link href="/" aria-label="Biodentis, inicio"><BrandLogo /></Link></CardTitle>
          <CardDescription>Recupera tu contraseña</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" isDisabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Recuerdas tu contraseña?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
