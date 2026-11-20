"use client";

import { useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Camera, Trash2 } from "lucide-react";

/** Lado del cuadrado final. Suficiente para pantallas retina a 96px. */
const OUTPUT_SIZE = 256;
const OUTPUT_QUALITY = 0.82;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_PORTRAIT_BYTES = 3 * 1024 * 1024;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Genera un avatar de 256×256; el retrato público conserva el archivo de entrada.
 *
 * El avatar pequeño se comprime en el navegador. El retrato viaja como data URL
 * con los bytes originales; el servidor valida, optimiza sin pérdida de
 * compresión y persiste su ruta en el perfil.
 */
async function toProfileDataUrl(file: File, portrait: boolean): Promise<string> {
  // La landing necesita más detalle que el avatar del menú. Evitar un recorte
  // pequeño y una conversión JPEG con pérdida antes de llegar al servidor.
  if (portrait) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el retrato"));
      reader.onerror = reader.onabort = () => reject(new Error("No se pudo leer el retrato"));
      reader.readAsDataURL(file);
    });
  }
  const bitmap = await createImageBitmap(file);
  const ratio = 1;
  const cropWidth = Math.min(bitmap.width, bitmap.height * ratio);
  const cropHeight = cropWidth / ratio;
  const sx = (bitmap.width - cropWidth) / 2;
  const sy = (bitmap.height - cropHeight) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");

  ctx.drawImage(bitmap, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", OUTPUT_QUALITY);
}

export interface AvatarPickerProps {
  firstName?: string | null;
  lastName?: string | null;
  /** Foto actual o selección local pendiente de guardar. */
  avatarUrl?: string | null;
  /** `null` = quitar la foto. */
  onChange: (dataUrl: string | null) => Promise<void> | void;
  isSaving?: boolean;
  disabled?: boolean;
  /** Envía el retrato público sin recortar ni recomprimir en el navegador. */
  portrait?: boolean;
  onProcessingChange?: (processing: boolean) => void;
}

export function AvatarPicker({
  firstName,
  lastName,
  avatarUrl,
  onChange,
  isSaving = false,
  disabled = false,
  portrait = false,
  onProcessingChange,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const busy = processing || isSaving;
  const shown = avatarUrl ?? null;

  const handleFile = async (file: File) => {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Formato no admitido. Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > (portrait ? MAX_PORTRAIT_BYTES : MAX_INPUT_BYTES)) {
      setError(portrait ? "El retrato supera los 3 MB permitidos para enviarlo sin recomprimir." : "La imagen supera los 5 MB.");
      return;
    }

    setProcessing(true);
    onProcessingChange?.(true);
    try {
      const dataUrl = await toProfileDataUrl(file, portrait);
      await onChange(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen");
    } finally {
      setProcessing(false);
      onProcessingChange?.(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setProcessing(true);
    try {
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
          className={portrait ? "h-36 w-30 rounded-xl" : "shadow-inner"}
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
            <span className="text-[10px] font-medium">{isSaving ? "Guardando…" : "Preparando…"}</span>
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

      {!disabled && <p className="text-center text-xs text-muted-foreground">JPG, PNG o WebP · Máximo {portrait ? 3 : 5} MB</p>}
      {error && <p role="alert" className="max-w-[12rem] text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
