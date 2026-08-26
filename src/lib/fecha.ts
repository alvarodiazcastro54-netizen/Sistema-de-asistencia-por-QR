// ─────────────────────────────────────────────
// Fecha del dojo, siempre en zona horaria de Perú.
//
// Por qué no basta `new Date().toISOString().slice(0, 10)`:
// el servidor de Next (en Vercel, Docker o donde sea) normalmente corre en UTC.
// Perú es UTC-5, así que desde las 19:00 hora local el servidor ya cree que
// es el día siguiente. Una inscripción que vence hoy rechazaría a un alumno
// en la clase de las 20:00, y las asistencias de la noche quedarían
// registradas con la fecha del día siguiente.
// ─────────────────────────────────────────────

export const ZONA_DOJO = "America/Lima";

const formateador = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_DOJO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Fecha de hoy en Lima como "YYYY-MM-DD", listo para comparar
 * contra las columnas `date` de Postgres (que son strings en Drizzle).
 *
 * Se usa formatToParts en vez de format() para no depender de cómo
 * cada versión de Node ordene o separe las partes del locale.
 */
export function hoyEnLima(ahora: Date = new Date()): string {
  const partes = formateador.formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
