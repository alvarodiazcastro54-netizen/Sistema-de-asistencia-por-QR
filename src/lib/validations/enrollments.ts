import { z } from "zod";
import { fechaSchema, uuidSchema } from "./common";

// ─────────────────────────────────────────────
// Validaciones de la tabla `enrollments`.
//
// El qrToken NO se recibe nunca del cliente: lo genera la BD
// (uuid().defaultRandom() en el schema). Así nadie puede elegir su propio token.
// El status tampoco: toda inscripción nueva nace ACTIVE.
// ─────────────────────────────────────────────

export const createEnrollmentSchema = z
  .object({
    studentId: uuidSchema,
    startDate: fechaSchema,
    endDate: fechaSchema,
  })
  .refine((d) => d.endDate >= d.startDate, {
    // Comparación de strings YYYY-MM-DD: al ser de largo fijo,
    // el orden alfabético coincide con el orden cronológico.
    path: ["endDate"],
    error: "La fecha de fin no puede ser anterior a la de inicio",
  });

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
