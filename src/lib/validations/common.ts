import { z } from "zod";

// ─────────────────────────────────────────────
// Validaciones reutilizables por todos los endpoints.
// ─────────────────────────────────────────────

/** Todos los id de la BD son uuid v4 (defaultRandom). */
export const uuidSchema = z.uuid({ error: "Debe ser un UUID válido" });

/** DNI peruano: 8 dígitos. Se permite hasta 20 por si se usa carné de extranjería. */
export const dniSchema = z
  .string({ error: "El DNI es obligatorio" })
  .trim()
  .regex(/^\d{8,20}$/, { error: "El DNI debe tener entre 8 y 20 dígitos" });

/** Fecha en formato YYYY-MM-DD (columnas `date` de Postgres). */
export const fechaSchema = z
  .string({ error: "La fecha es obligatoria" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Formato esperado: YYYY-MM-DD" })
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), {
    error: "Fecha inexistente en el calendario",
  });

/**
 * Hora HH:MM o HH:MM:SS (columnas `time` de Postgres).
 * Se normaliza siempre a HH:MM:SS para que comparar dos horas como strings
 * sea confiable (si una midiera 5 caracteres y la otra 8, el orden
 * alfabético dejaría de coincidir con el cronológico).
 */
export const horaSchema = z
  .string({ error: "La hora es obligatoria" })
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    error: "Formato esperado: HH:MM",
  })
  .transform((v) => (v.length === 5 ? `${v}:00` : v));
