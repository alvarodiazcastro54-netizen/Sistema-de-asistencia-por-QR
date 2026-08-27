import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendances, classSessions, enrollments, students } from "@/db/schema";
import { uuidSchema } from "@/lib/validations/common";
import { hoyEnLima } from "@/lib/fecha";
import { fail, failInterno, ok } from "@/lib/api";

// ─────────────────────────────────────────────
// GET /api/portal/[token] → portal público del alumno (/alumno/[token])
//
// ÚNICA ruta de la API que busca por qrToken en vez de por id. Es pública:
// cualquiera con el link ve la respuesta, así que devuelve el mínimo
// indispensable para la pantalla de Mayerli y NADA más:
//
//   - del alumno: solo nombre y apellido. Sin dni, email, teléfono, fecha de
//     nacimiento ni id interno. Un QR que se cae al piso no debe filtrar el
//     documento de un menor de edad.
//   - de la inscripción: estado y vigencia. Sin id ni studentId, para que
//     este token no sirva de puente hacia las rutas administrativas
//     (/api/inscripciones/[id], /api/alumnos/[id]).
//
// El resto de mis rutas sigue buscando por id y no cambia.
// ─────────────────────────────────────────────

/**
 * Un token que no existe y un token con formato inválido son lo mismo para
 * el alumno: ese QR no le sirve. Mismo 404 para los dos, igual que hace
 * la validación 1 de /api/asistencias/scan.
 *
 * No se responde 400 con el detalle de Zod a propósito: es una ruta pública
 * y contar "esto no es un uuid" solo le sirve a quien esté probando tokens.
 */
function tokenNoEncontrado() {
  return fail(
    "NO_ENCONTRADO",
    "Este QR no corresponde a ninguna inscripción",
    404,
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const parsed = uuidSchema.safeParse(token);
  if (!parsed.success) return tokenNoEncontrado();

  try {
    // El qrToken es UNIQUE, así que esto trae 0 o 1 fila.
    // innerJoin y no leftJoin: student_id es NOT NULL + FK, el alumno existe.
    const [fila] = await db
      .select({
        // enrollmentId queda fuera de la respuesta: solo se usa acá abajo
        // para filtrar las asistencias.
        enrollmentId: enrollments.id,
        inscripcion: {
          status: enrollments.status,
          startDate: enrollments.startDate,
          endDate: enrollments.endDate,
          qrToken: enrollments.qrToken,
        },
        alumno: {
          firstName: students.firstName,
          lastName: students.lastName,
        },
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.qrToken, parsed.data))
      .limit(1);

    if (!fila) return tokenNoEncontrado();

    // Una inscripción EXPIRED o CANCELLED igual responde 200: el alumno tiene
    // derecho a ver que su plan venció y su historial de cuando sí entrenaba.
    // El 404 es solo para un token que no existe.

    // Historial de ESTA inscripción, no de todas las del alumno: el QR
    // pertenece a la inscripción. Si el alumno renovó, su nuevo QR trae su
    // propio historial y el viejo sigue mostrando el periodo viejo.
    //
    // Sin paginación, igual que GET /api/inscripciones: un periodo del dojo
    // son unas decenas de clases. Si algún día pesa, se le agrega
    // limit/offset como en GET /api/asistencias.
    const asistencias = await db
      .select({
        classDate: classSessions.classDate,
        className: classSessions.name,
        // La clase pudo cancelarse o cerrarse después del escaneo. Va el
        // estado para que el portal no pinte "Presente" a secas en una clase
        // que el dojo terminó cancelando.
        classStatus: classSessions.status,
        scannedAt: attendances.scannedAt,
      })
      .from(attendances)
      .innerJoin(
        classSessions,
        eq(attendances.classSessionId, classSessions.id),
      )
      .where(eq(attendances.enrollmentId, fila.enrollmentId))
      .orderBy(desc(classSessions.classDate), desc(attendances.scannedAt));

    // `status` es lo que dice la columna; `vigente` es si el QR de verdad
    // abre la puerta hoy. Pueden no coincidir: nadie corre un cron que pase
    // las inscripciones a EXPIRED, así que una fila puede seguir ACTIVE con
    // endDate de la semana pasada. Mostrar un tag verde ahí y que el scanner
    // después rechace al alumno con FUERA_DE_VIGENCIA es la peor combinación.
    //
    // Misma regla que las validaciones 2 y 3 de @/lib/asistencias, y misma
    // comparación de strings YYYY-MM-DD (largo fijo → orden alfabético =
    // orden cronológico). `hoy` sale en la respuesta para que el portal no
    // tenga que confiar en la hora del celular del alumno.
    const hoy = hoyEnLima();
    const vigente =
      fila.inscripcion.status === "ACTIVE" &&
      hoy >= fila.inscripcion.startDate &&
      hoy <= fila.inscripcion.endDate;

    return ok({
      alumno: fila.alumno,
      inscripcion: { ...fila.inscripcion, vigente, hoy },
      asistencias,
    });
  } catch (e) {
    return failInterno("GET /api/portal/[token]", e);
  }
}
