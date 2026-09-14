"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Camera, Trash2 } from "lucide-react";

/** Lado del cuadrado final. Suficiente para pantallas retina a 96px. */
const OUTPUT_SIZE = 256;
const OUTPUT_QUALITY = 0.82;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Recorta la imagen al cuadrado central y la reescala a 256x256 JPEG.
 *
 * Se hace en el navegador para no subir un archivo de varios MB: lo que viaja
 * al backend es un data URL de ~20 KB que cabe sin problema en la columna
 * `users.avatarUrl`, sin necesidad de almacenamiento de objetos.
 */
async function toSquareDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", OUTPUT_QUALITY);
}

export interface AvatarPickerProps {
  firstName?: string | null;
  lastName?: string | null;
  /** Foto guardada actualmente. */
  avatarUrl?: string | null;
  /** `null` = quitar la foto. */
  onChange: (dataUrl: string | null) => Promise<void> | void;
  isSaving?: boolean;
  disabled?: boolean;
}

export function AvatarPicker({
  firstName,
  lastName,
  avatarUrl,
  onChange,
  isSaving = false,
  disabled = false,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const busy = processing || isSaving;
  const shown = preview ?? avatarUrl ?? null;

  const handleFile = async (file: File) => {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Formato no admitido. Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("La imagen supera los 8 MB.");
      return;
    }

    setProcessing(true);
    try {
      const dataUrl = await toSquareDataUrl(file);
      setPreview(dataUrl);
      await onChange(dataUrl);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setProcessing(true);
    try {
      setPreview(null);
      await onChange(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar la foto");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <UserAvatar
          firstName={firstName}
          lastName={lastName}
          avatarUrl={shown}
          size="xl"
          className="shadow-inner"
        />

        {!disabled && (
          <button
            type="button"
            title="Cambiar foto de perfil"
            aria-label="Cambiar foto de perfil"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <span className="text-[10px] font-medium">Guardando…</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Se limpia el input para poder volver a elegir el mismo archivo.
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {!disabled && shown && (
        <Button variant="ghost" size="sm" onPress={handleRemove} isDisabled={busy}>
          <Trash2 className="h-3.5 w-3.5" />
          Quitar foto
        </Button>
      )}

      {error && <p className="max-w-[12rem] text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
