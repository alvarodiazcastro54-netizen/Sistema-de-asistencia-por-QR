import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, students } from "@/db/schema";
import { scanSchema } from "@/lib/validations/attendances";
import { uuidSchema } from "@/lib/validations/common";
import {
  responderAsistencia,
  validarYRegistrarAsistencia,
} from "@/lib/asistencias";
import { fail, failInterno, failValidacion, leerJson } from "@/lib/api";

// ─────────────────────────────────────────────
// POST /api/asistencias/scan
// Body: { "qrToken": "...", "classSessionId": "..." }
//
// Las 6 validaciones, en este orden exacto:
//   1. ¿Existe el qrToken?                    → 404 QR_INVALIDO
//   2. ¿La inscripción está ACTIVE?           → 409 INSCRIPCION_VENCIDA
//   3. ¿Hoy está entre startDate y endDate?   → 409 FUERA_DE_VIGENCIA
//   4. ¿Existe la clase?                      → 404 CLASE_INEXISTENTE
//   5. ¿La clase está OPEN?                   → 409 CLASE_CERRADA
//   6. ¿Ya hay asistencia para esta clase?    → 409 YA_REGISTRADA
//   → INSERT con method = "QR"                → 201
//
// La 1 se hace acá (es lo propio del QR); de la 2 a la 6 y el INSERT
// están en @/lib/asistencias, compartidas con /asistencias/manual.
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await leerJson(req);
  const parsed = scanSchema.safeParse(body);

  // Solo falla si faltan los campos por completo (error del cliente,
  // no un QR malo). Un qrToken presente pero con formato raro sigue de largo
  // hasta la validación 1.
  if (!parsed.success) return failValidacion(parsed.error);

  const { qrToken, classSessionId } = parsed.data;

  try {
    // ── Validación 1: ¿existe ese qrToken?
    // Si no tiene forma de uuid, no puede existir en la columna qr_token:
    // es un QR inválido, no un error de formato.
    const token = uuidSchema.safeParse(qrToken);
    if (!token.success) {
      return fail("QR_INVALIDO", "QR inválido", 404);
    }

    const [inscripcion] = await db
      .select({
        id: enrollments.id,
        status: enrollments.status,
        startDate: enrollments.startDate,
        endDate: enrollments.endDate,
        alumno: {
          id: students.id,
          dni: students.dni,
          firstName: students.firstName,
          lastName: students.lastName,
        },
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.qrToken, token.data))
      .limit(1);

    if (!inscripcion) {
      return fail("QR_INVALIDO", "QR inválido", 404);
    }

    // ── Validaciones 2 a 6 + INSERT (method = "QR")
    const resultado = await validarYRegistrarAsistencia(
      inscripcion,
      classSessionId,
      "QR",
    );

    return responderAsistencia(resultado, inscripcion.alumno);
  } catch (e) {
    return failInterno("POST /api/asistencias/scan", e);
  }
}
