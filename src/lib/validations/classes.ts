import { z } from "zod";
import { fechaSchema, horaSchema } from "./common";

// ─────────────────────────────────────────────
// Validaciones de la tabla `class_sessions`.
// ─────────────────────────────────────────────

/** Los tres valores del enum class_session_status del schema. */
export const classStatusEnum = z.enum(["OPEN", "CLOSED", "CANCELLED"], {
  error: "El status debe ser OPEN, CLOSED o CANCELLED",
});

export const createClassSessionSchema = z
  .object({
    name: z
      .string({ error: "El nombre de la clase es obligatorio" })
      .trim()
      .min(3, { error: "El nombre debe tener al menos 3 caracteres" })
      .max(150, { error: "Máximo 150 caracteres" }),
    classDate: fechaSchema,
    startTime: horaSchema,
    endTime: horaSchema,
    // Opcional: por defecto la BD la crea OPEN.
    status: classStatusEnum.optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    path: ["endTime"],
    error: "La hora de fin debe ser posterior a la de inicio",
  });

export type CreateClassSessionInput = z.infer<typeof createClassSessionSchema>;

/** Filtros opcionales de GET /api/clases */
export const listClassSessionsQuerySchema = z.object({
  /** Día exacto: ?date=2026-08-26 */
  date: fechaSchema.optional(),
  /** Rango: ?from=2026-08-01&to=2026-08-31 */
  from: fechaSchema.optional(),
  to: fechaSchema.optional(),
  status: classStatusEnum.optional(),
});

/** Body de PATCH /api/clases/[id] — solo el status. */
export const updateClassStatusSchema = z.object({
  status: classStatusEnum,
});
