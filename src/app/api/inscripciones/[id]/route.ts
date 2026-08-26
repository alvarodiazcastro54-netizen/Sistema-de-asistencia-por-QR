import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, students } from "@/db/schema";
import { uuidSchema } from "@/lib/validations/common";
import { fail, failInterno, failValidacion, ok } from "@/lib/api";

// ─────────────────────────────────────────────
// GET /api/inscripciones/[id] → la inscripción con su qrToken
//
// Trae también los datos del alumno en un solo query (innerJoin), para que
// el admin pueda mostrar "QR de Ana Torres" sin pegarle a /api/alumnos/[id].
// innerJoin y no leftJoin porque student_id es NOT NULL + FK: siempre existe.
// ─────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return failValidacion(parsed.error);

  try {
    const [fila] = await db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        startDate: enrollments.startDate,
        endDate: enrollments.endDate,
        status: enrollments.status,
        qrToken: enrollments.qrToken,
        createdAt: enrollments.createdAt,
        alumno: {
          id: students.id,
          dni: students.dni,
          firstName: students.firstName,
          lastName: students.lastName,
          active: students.active,
        },
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.id, parsed.data))
      .limit(1);

    if (!fila) {
      return fail("NO_ENCONTRADO", "Inscripción no encontrada", 404);
    }

    return ok(fila);
  } catch (e) {
    return failInterno("GET /api/inscripciones/[id]", e);
  }
}
