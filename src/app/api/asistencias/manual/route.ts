import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, students } from "@/db/schema";
import { manualSchema } from "@/lib/validations/attendances";
import {
  responderAsistencia,
  validarYRegistrarAsistencia,
} from "@/lib/asistencias";
import { fail, failInterno, failValidacion, leerJson } from "@/lib/api";

// ─────────────────────────────────────────────
// POST /api/asistencias/manual
// Body: { "dni": "72345678", "classSessionId": "..." }
//
// Idéntico a /scan salvo dos cosas:
//   - la validación 1 busca por dni en vez de por qrToken
//   - el INSERT guarda method = "MANUAL"
// Las validaciones 2 a 6 son literalmente el mismo código (@/lib/asistencias),
// así que las reglas nunca pueden divergir entre el QR y lo manual.
//
// Para qué sirve: el alumno olvidó el celular, se le rompió la pantalla,
// o el scanner no lee. El profe marca a mano y queda registrado como MANUAL
// para poder auditar después quién entró sin escanear.
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await leerJson(req);
  const parsed = manualSchema.safeParse(body);

  if (!parsed.success) return failValidacion(parsed.error);

  const { dni, classSessionId } = parsed.data;

  try {
    // ── Validación 1 (versión manual): ¿existe un alumno con ese DNI,
    // y tiene alguna inscripción?
    //
    // Se traen las inscripciones del alumno ordenadas: la ACTIVE primero y,
    // si no hay ninguna, la más reciente. Ese orden importa.
    // Si buscara solo `status = 'ACTIVE'` y no encontrara nada, no podría
    // distinguir "nunca se inscribió" de "su inscripción venció", y el profe
    // vería el mensaje equivocado. Trayendo la más reciente igual, la
    // validación 2 puede responder "Inscripción vencida" como corresponde.
    //
    // La regla del #2 (una sola ACTIVE por alumno) es lo que hace que esto
    // no sea ambiguo: si hay una ACTIVE, es LA inscripción del alumno.
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
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .where(eq(students.dni, dni))
      .orderBy(
        sql`(${enrollments.status} = 'ACTIVE') desc`,
        desc(enrollments.createdAt),
      )
      .limit(1);

    if (!inscripcion) {
      // El innerJoin no distingue los dos casos, así que se revisa aparte
      // para dar un mensaje útil al profe.
      const [alumno] = await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.dni, dni))
        .limit(1);

      return alumno
        ? fail(
            "INSCRIPCION_VENCIDA",
            "El alumno no tiene ninguna inscripción registrada",
            409,
          )
        : fail("NO_ENCONTRADO", "No existe un alumno con ese DNI", 404);
    }

    // ── Validaciones 2 a 6 + INSERT (method = "MANUAL")
    const resultado = await validarYRegistrarAsistencia(
      inscripcion,
      classSessionId,
      "MANUAL",
    );

    return responderAsistencia(resultado, inscripcion.alumno);
  } catch (e) {
    return failInterno("POST /api/asistencias/manual", e);
  }
}
