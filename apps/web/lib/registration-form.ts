/** Normaliza un teléfono local o con prefijo peruano, sin truncar números inválidos. */
export function normalizeRegistrationPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
}
