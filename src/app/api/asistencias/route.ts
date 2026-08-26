import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { attendances, classSessions, enrollments, students } from "@/db/schema";
import { listAttendancesQuerySchema } from "@/lib/validations/attendances";
import { failInterno, failValidacion, ok } from "@/lib/api";

// ─────────────────────────────────────────────
// GET /api/asistencias → listado con filtros opcionales, todos combinables:
//
//   ?date=2026-08-26                 fecha de la clase (día exacto)
//   ?from=2026-08-01&to=2026-08-31   rango de fechas de clase
//   ?studentId=<uuid>                por alumno
//   ?dni=72345678                    por alumno (alternativa al uuid)
//   ?classSessionId=<uuid>           por clase
//   ?method=QR|MANUAL                para auditar las marcadas a mano
//   ?limit=200&offset=0              paginación
//
// La fecha filtra por class_sessions.class_date (cuándo fue la clase),
// no por scanned_at (cuándo se apretó el botón). Para un reporte del dojo
// interesa la clase; si el profe marca a las 23:50 una clase de las 18:00,
// esa asistencia debe salir en el día de la clase.
// ─────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = listAttendancesQuerySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
    dni: searchParams.get("dni") ?? undefined,
    classSessionId: searchParams.get("classSessionId") ?? undefined,
    method: searchParams.get("method") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) return failValidacion(parsed.error);

  const { date, from, to, studentId, dni, classSessionId, method, limit, offset } =
    parsed.data;

  try {
    const filtros = [];

    if (date) filtros.push(eq(classSessions.classDate, date));
    if (from) filtros.push(gte(classSessions.classDate, from));
    if (to) filtros.push(lte(classSessions.classDate, to));
    if (studentId) filtros.push(eq(students.id, studentId));
    if (dni) filtros.push(eq(students.dni, dni));
    if (classSessionId) filtros.push(eq(attendances.classSessionId, classSessionId));
    if (method) filtros.push(eq(attendances.method, method));

    // Se piden limit + 1 filas: si vuelve la extra, hay más páginas.
    // Evita un COUNT(*) aparte solo para saber si truncamos.
    const filas = await db
      .select({
        id: attendances.id,
        scannedAt: attendances.scannedAt,
        method: attendances.method,
        enrollmentId: attendances.enrollmentId,
        alumno: {
          id: students.id,
          dni: students.dni,
          firstName: students.firstName,
          lastName: students.lastName,
        },
        clase: {
          id: classSessions.id,
          name: classSessions.name,
          classDate: classSessions.classDate,
          startTime: classSessions.startTime,
          endTime: classSessions.endTime,
          status: classSessions.status,
        },
      })
      .from(attendances)
      .innerJoin(enrollments, eq(attendances.enrollmentId, enrollments.id))
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(desc(classSessions.classDate), desc(attendances.scannedAt))
      .limit(limit + 1)
      .offset(offset);

    const hayMas = filas.length > limit;
    const asistencias = hayMas ? filas.slice(0, limit) : filas;

    return ok({
      total: asistencias.length,
      // `hayMas` hace visible el corte: un reporte truncado en silencio
      // se lee como "estas son todas" cuando no lo son.
      hayMas,
      limit,
      offset,
      asistencias,
    });
  } catch (e) {
    return failInterno("GET /api/asistencias", e);
  }
}
