import { z } from "zod";
import { dniSchema, fechaSchema, uuidSchema } from "./common";

// ─────────────────────────────────────────────
// Validaciones de la tabla `attendances`.
//
// OJO: qrToken y classSessionId se validan acá solo como "string no vacío",
// NO como uuid. El formato de uuid se revisa después, dentro del orden
// exacto de las 6 validaciones:
//   - un qrToken con formato inválido → "QR inválido"      (validación 1)
//   - un classSessionId inválido      → "Clase inexistente" (validación 4)
// Si se validaran como uuid acá, ambos casos darían un 400 genérico ANTES
// de la validación 1 y el scanner mostraría el mensaje equivocado.
// ─────────────────────────────────────────────

export const scanSchema = z.object({
  qrToken: z
    .string({ error: "El qrToken es obligatorio" })
    .trim()
    .min(1, { error: "El qrToken es obligatorio" }),
  classSessionId: z
    .string({ error: "El classSessionId es obligatorio" })
    .trim()
    .min(1, { error: "El classSessionId es obligatorio" }),
});

export const manualSchema = z.object({
  dni: dniSchema,
  classSessionId: z
    .string({ error: "El classSessionId es obligatorio" })
    .trim()
    .min(1, { error: "El classSessionId es obligatorio" }),
});

// ─────────────────────────────────────────────
// Filtros de GET /api/asistencias — todos opcionales y combinables.
// Acá sí se valida como uuid: es un listado, no el flujo del scanner,
// así que un id mal formado es efectivamente un error del cliente.
// ─────────────────────────────────────────────

export const listAttendancesQuerySchema = z.object({
  /** Por fecha DE LA CLASE (no de cuándo se escaneó). */
  date: fechaSchema.optional(),
  from: fechaSchema.optional(),
  to: fechaSchema.optional(),
  /** Por alumno: uuid o DNI, cualquiera de los dos. */
  studentId: uuidSchema.optional(),
  dni: dniSchema.optional(),
  /** Por clase. */
  classSessionId: uuidSchema.optional(),
  /** Extra útil para auditar: ver solo las marcadas a mano. */
  method: z
    .enum(["QR", "MANUAL"], { error: "method debe ser QR o MANUAL" })
    .optional(),
  limit: z.coerce
    .number({ error: "limit debe ser un número" })
    .int({ error: "limit debe ser entero" })
    .min(1, { error: "limit mínimo 1" })
    .max(500, { error: "limit máximo 500" })
    .default(200),
  offset: z.coerce
    .number({ error: "offset debe ser un número" })
    .int({ error: "offset debe ser entero" })
    .min(0, { error: "offset mínimo 0" })
    .default(0),
});
