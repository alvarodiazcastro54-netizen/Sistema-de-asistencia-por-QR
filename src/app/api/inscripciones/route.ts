import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, students } from "@/db/schema";
import {
  createEnrollmentSchema,
  listEnrollmentsQuerySchema,
} from "@/lib/validations/enrollments";
import {
  fail,
  failInterno,
  failValidacion,
  leerJson,
  ok,
  pgErrorCode,
} from "@/lib/api";

// ─────────────────────────────────────────────
// POST /api/inscripciones
//
// Regla del dojo: un alumno solo puede tener UNA inscripción ACTIVE a la vez,
// sin importar las fechas. Si ya tiene una → 409.
//
// Todo va dentro de una transacción con SELECT ... FOR UPDATE sobre la fila
// del alumno. Sin ese lock, dos POST simultáneos del mismo alumno pasarían
// ambos la verificación y crearían dos inscripciones ACTIVE (= dos QR válidos,
// y el scan no sabría cuál usar). No hay UNIQUE en la BD que lo impida.
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await leerJson(req);
  const parsed = createEnrollmentSchema.safeParse(body);

  if (!parsed.success) return failValidacion(parsed.error);

  const { studentId, startDate, endDate } = parsed.data;

  try {
    const resultado = await db.transaction(async (tx) => {
      // 1. Bloquea la fila del alumno hasta el fin de la transacción.
      const [alumno] = await tx
        .select({
          id: students.id,
          dni: students.dni,
          firstName: students.firstName,
          lastName: students.lastName,
          active: students.active,
        })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)
        .for("update");

      if (!alumno) {
        return { tipo: "alumno_no_encontrado" as const };
      }

      // Un alumno dado de baja no debería recibir un QR válido.
      // Si en el dojo esto no aplica, borra este bloque y listo.
      if (!alumno.active) {
        return { tipo: "alumno_inactivo" as const };
      }

      // 2. ¿Ya tiene una inscripción ACTIVE?
      const [activa] = await tx
        .select({
          id: enrollments.id,
          startDate: enrollments.startDate,
          endDate: enrollments.endDate,
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, studentId),
            eq(enrollments.status, "ACTIVE"),
          ),
        )
        .limit(1);

      if (activa) {
        return { tipo: "ya_tiene_activa" as const, activa };
      }

      // 3. Crear. qrToken y status los pone la BD por defecto.
      const [inscripcion] = await tx
        .insert(enrollments)
        .values({ studentId, startDate, endDate })
        .returning();

      return { tipo: "creada" as const, inscripcion, alumno };
    });

    switch (resultado.tipo) {
      case "alumno_no_encontrado":
        return fail("NO_ENCONTRADO", "El alumno no existe", 404);

      case "alumno_inactivo":
        return fail(
          "DUPLICADO",
          "El alumno está inactivo, no se le puede inscribir",
          409,
        );

      case "ya_tiene_activa":
        return fail(
          "DUPLICADO",
          "El alumno ya tiene una inscripción activa",
          409,
          {
            inscripcionActiva: resultado.activa,
          },
        );

      case "creada":
        return ok(
          {
            ...resultado.inscripcion,
            alumno: {
              id: resultado.alumno.id,
              dni: resultado.alumno.dni,
              firstName: resultado.alumno.firstName,
              lastName: resultado.alumno.lastName,
            },
          },
          201,
        );
    }
  } catch (e) {
    // El alumno fue borrado entre la validación y el insert.
    if (pgErrorCode(e) === "23503") {
      return fail("NO_ENCONTRADO", "El alumno no existe", 404);
    }
    return failInterno("POST /api/inscripciones", e);
  }
}

// ─────────────────────────────────────────────
// GET /api/inscripciones → listado
// Filtro opcional: ?studentId=<uuid>  → historial de ese alumno
//
// Trae el alumno con innerJoin, igual que GET /api/inscripciones/[id]:
// sin filtro el listado necesita saber de quién es cada inscripción, y con
// filtro sale gratis (ya se está tocando la tabla para el JOIN de la FK).
//
// Se ordena por startDate desc y no por createdAt: el historial se lee por
// periodo cursado, no por el momento en que el admin cargó el dato. createdAt
// queda como desempate para dos inscripciones que arranquen el mismo día.
//
// Sin paginación, igual que GET /api/alumnos: un alumno del dojo acumula
// unas pocas inscripciones al año. Si el listado completo llega a pesar,
// se le agrega limit/offset como en GET /api/asistencias.
// ─────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = listEnrollmentsQuerySchema.safeParse({
    studentId: searchParams.get("studentId") ?? undefined,
  });

  if (!parsed.success) return failValidacion(parsed.error);

  const { studentId } = parsed.data;

  try {
    const filtros = [];

    if (studentId) filtros.push(eq(enrollments.studentId, studentId));

    const lista = await db
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
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(desc(enrollments.startDate), desc(enrollments.createdAt));

    // Un studentId que no existe devuelve total 0, no 404: es un listado
    // vacío, y la página /admin/alumnos/[id] ya sabe si el alumno existe
    // porque para renderizarse tuvo que pedirlo a /api/alumnos/[id].
    return ok({ total: lista.length, inscripciones: lista });
  } catch (e) {
    return failInterno("GET /api/inscripciones", e);
  }
}
