/** Interpreta el formato de notas existente sin modificar el registro original. */
export function parseClinicalNote(notes: string) {
  // Prioriza encabezados en líneas separadas, como los guarda el servicio.
  // También admite registros antiguos con todos los encabezados en una línea.
  const sections =
    notes.match(
      /^\s*Diagn[oó]stico\s*:\s*([\s\S]*?)\r?\n\s*Tratamiento(?: realizado)?\s*:\s*([\s\S]*?)(?:\r?\n\s*Pr[oó]ximo control\s*:\s*([\s\S]*))?\s*$/i
    ) ??
    notes.match(
      /^\s*Diagn[oó]stico\s*:\s*([\s\S]*?)\s+Tratamiento(?: realizado)?\s*:\s*([\s\S]*?)(?:\s+Pr[oó]ximo control\s*:\s*([\s\S]*))?\s*$/i
    )
  if (!sections) return null

  const toItems = (text: string) =>
    text
      .trim()
      .split(/\r?\n(?=\s*\d+[.)]\s+)/)
      .map((item) => item.replace(/^\s*\d+[.)]\s+/, "").trim())
      .filter(Boolean)

  return {
    diagnoses: toItems(sections[1] ?? ""),
    treatments: toItems(sections[2] ?? ""),
    nextControl: sections[3]?.trim() || null,
  }
}
