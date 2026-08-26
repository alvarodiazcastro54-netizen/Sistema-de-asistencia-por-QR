import { z } from "zod";
import { dniSchema, fechaSchema } from "./common";

// ─────────────────────────────────────────────
// Validaciones de la tabla `students`.
// Los largos coinciden con el varchar() del schema para que Postgres
// nunca reciba un string más largo que la columna.
// ─────────────────────────────────────────────

/** Campo opcional que además acepta "" y lo convierte en null. */
const opcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    schema.nullable(),
  );

export const createStudentSchema = z.object({
  dni: dniSchema,
  firstName: z
    .string({ error: "El nombre es obligatorio" })
    .trim()
    .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { error: "Máximo 100 caracteres" }),
  lastName: z
    .string({ error: "El apellido es obligatorio" })
    .trim()
    .min(2, { error: "El apellido debe tener al menos 2 caracteres" })
    .max(100, { error: "Máximo 100 caracteres" }),
  email: opcional(
    z.email({ error: "Correo inválido" }).max(255, { error: "Máximo 255 caracteres" }),
  ),
  phone: opcional(
    z
      .string()
      .trim()
      .regex(/^[\d+\s()-]{6,20}$/, { error: "Teléfono inválido" }),
  ),
  birthDate: opcional(fechaSchema),
  active: z.boolean().optional().default(true),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

/** Filtros opcionales de GET /api/alumnos */
export const listStudentsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  active: z
    .enum(["true", "false"], { error: "active debe ser true o false" })
    .optional(),
});
