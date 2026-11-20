"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/client-session";
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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [privateImage, setPrivateImage] = useState<{ source: string; url: string } | null>(null);
  const privateAvatar = Boolean(avatarUrl?.startsWith("/api/uploads/avatares/"));
  useEffect(() => {
    if (!privateAvatar || !avatarUrl) return;
    let active = true;
    let objectUrl: string | undefined;
    void authenticatedFetch(avatarUrl).then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el avatar");
      const blob = await response.blob();
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPrivateImage({ source: avatarUrl, url: objectUrl });
    }).catch(() => { if (active) setFailedUrl(avatarUrl); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [avatarUrl, privateAvatar]);
  const imageUrl = privateAvatar ? (privateImage && privateImage.source === avatarUrl ? privateImage.url : null) : avatarUrl;
  const showImage = Boolean(imageUrl) && failedUrl !== avatarUrl;

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
          src={imageUrl as string}
          alt={`Foto de ${firstName ?? ""} ${lastName ?? ""}`.trim()}
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(avatarUrl ?? null)}
        />
      ) : (
        <span>{initialsOf(firstName, lastName)}</span>
      )}
    </div>
  );
}
