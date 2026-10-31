"use client";

import { AvatarPicker, type AvatarPickerProps } from "./avatar-picker";

// Biblioteca de archivos disponibles. La asociación a una persona la elige
// el administrador y se guarda en users.avatarUrl, nunca se infiere del nombre.
const photos = ["angel.jpg", "cielo.jpg", "gabriel.jpg", "luis.jpg", "marcelo.jpg", "maria.jpg", "maricielo.jpg", "mario.jpg"];

export function ProfilePhotoPicker(props: AvatarPickerProps) {
  return <div className="space-y-3">
    <AvatarPicker {...props} />
    <details className="rounded-xl border p-3">
      <summary className="cursor-pointer text-sm font-medium">Elegir una de las imágenes disponibles</summary>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {photos.map((file) => {
          const src = `/images/${file}`;
          return <button key={file} type="button" disabled={props.disabled || props.isSaving} aria-label={`Usar imagen ${file}`} aria-pressed={props.avatarUrl === src} onClick={() => void props.onChange(src)} className="overflow-hidden rounded-lg border border-input bg-muted p-1 text-xs transition-colors hover:border-ring aria-pressed:ring-2 aria-pressed:ring-ring disabled:opacity-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Imagen disponible: ${file}`} loading="lazy" className="aspect-[5/6] w-full rounded-md object-cover" />
            <span className="mt-1 block truncate">{file}</span>
          </button>;
        })}
      </div>
    </details>
  </div>;
}
