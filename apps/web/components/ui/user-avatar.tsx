"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-24 w-24 text-2xl",
} as const;

export interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function initialsOf(firstName?: string | null, lastName?: string | null): string {
  const a = firstName?.trim()?.[0] ?? "";
  const b = lastName?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

/**
 * Avatar del usuario con iniciales como respaldo.
 *
 * Sin servicios externos a propósito: generadores como DiceBear fallan sin red
 * o tras un CSP y dejan el icono roto que se veía antes. Si la imagen guardada
 * no carga, se vuelve a las iniciales en lugar de mostrar el hueco.
 */
export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = "sm",
  className,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-foreground",
        SIZES[size],
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl as string}
          alt={`Foto de ${firstName ?? ""} ${lastName ?? ""}`.trim()}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initialsOf(firstName, lastName)}</span>
      )}
    </div>
  );
}
