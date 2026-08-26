import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendances, classSessions } from "@/db/schema";
import { uuidSchema } from "@/lib/validations/common";
import { hoyEnLima } from "@/lib/fecha";
import { fail, ok } from "@/lib/api";

// ─────────────────────────────────────────────
// Lógica compartida entre /asistencias/scan (QR) y /asistencias/manual (DNI).
//
// La ÚNICA diferencia entre los dos endpoints es cómo encuentran la
// inscripción (validación 1: por qrToken vs por dni) y el `method` que
// guardan. Las validaciones 2 a 6 y el INSERT son idénticas, así que viven
// acá una sola vez: si mañana cambia una regla, cambia para ambos.
// ─────────────────────────────────────────────

/** Lo mínimo que se necesita de la inscripción, ya encontrada por el endpoint. */
export type InscripcionParaAsistencia = {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
};

export type ResultadoAsistencia =
  | { tipo: "inscripcion_no_activa"; status: string }
  | { tipo: "fuera_de_vigencia"; hoy: string; startDate: string; endDate: string }
  | { tipo: "clase_inexistente" }
  | { tipo: "clase_cerrada"; status: string }
  | {
      tipo: "ya_registrada";
      existente: { id: string; scannedAt: Date; method: "QR" | "MANUAL" };
      clase: DatosClase;
    }
  | {
      tipo: "registrada";
      asistencia: typeof attendances.$inferSelect;
      clase: DatosClase;
    };

type DatosClase = {
  id: string;
  name: string;
  classDate: string;
  startTime: string;
  endTime: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
};

/**
 * Ejecuta las validaciones 2 a 6 EN ESTE ORDEN y, si todas pasan, inserta.
 * La validación 1 (existe el QR / el DNI) la hace cada endpoint antes de llamar.
 */
export async function validarYRegistrarAsistencia(
  inscripcion: InscripcionParaAsistencia,
  classSessionIdCrudo: string,
  method: "QR" | "MANUAL",
): Promise<ResultadoAsistencia> {
  // ── Validación 2: ¿la inscripción está ACTIVE?
  if (inscripcion.status !== "ACTIVE") {
    return { tipo: "inscripcion_no_activa", status: inscripcion.status };
  }

  // ── Validación 3: ¿hoy está entre startDate y endDate? (ambos inclusive)
  // Comparación de strings YYYY-MM-DD, sin objetos Date de por medio.
  const hoy = hoyEnLima();
  if (hoy < inscripcion.startDate || hoy > inscripcion.endDate) {
    return {
      tipo: "fuera_de_vigencia",
      hoy,
      startDate: inscripcion.startDate,
      endDate: inscripcion.endDate,
    };
  }

  // ── Validación 4: ¿existe la clase?
  // Un classSessionId que no es uuid no puede existir en la BD, así que
  // cuenta como clase inexistente y no como error de formato: así se respeta
  // el orden exacto de las validaciones.
  const idClase = uuidSchema.safeParse(classSessionIdCrudo);
  if (!idClase.success) {
    return { tipo: "clase_inexistente" };
  }

  const [clase] = await db
    .select({
      id: classSessions.id,
      name: classSessions.name,
      classDate: classSessions.classDate,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
      status: classSessions.status,
    })
    .from(classSessions)
    .where(eq(classSessions.id, idClase.data))
    .limit(1);

  if (!clase) {
    return { tipo: "clase_inexistente" };
  }

  // ── Validación 5: ¿la clase está OPEN?
  if (clase.status !== "OPEN") {
    return { tipo: "clase_cerrada", status: clase.status };
  }

  // ── Validación 6: ¿ya existe asistencia para enrollmentId + classSessionId?
  const [existente] = await db
    .select({
      id: attendances.id,
      scannedAt: attendances.scannedAt,
      method: attendances.method,
    })
    .from(attendances)
    .where(
      and(
        eq(attendances.enrollmentId, inscripcion.id),
        eq(attendances.classSessionId, clase.id),
      ),
    )
    .limit(1);

  if (existente) {
    return { tipo: "ya_registrada", existente, clase };
  }

  // ── Todo pasó: registrar.
  //
  // onConflictDoNothing cierra la ventana de carrera que deja la validación 6:
  // entre ese SELECT y este INSERT hay milisegundos en los que un segundo
  // escaneo del mismo QR también pasaría la validación 6. Sin esto, el índice
  // uniq_enrollment_class lanzaría un 23505 y el profe vería un 500.
  // Con esto, el segundo escaneo simplemente no inserta y devuelve `undefined`,
  // que tratamos igual que "ya registrada".
  const [asistencia] = await db
    .insert(attendances)
    .values({
      enrollmentId: inscripcion.id,
      classSessionId: clase.id,
      method,
    })
    .onConflictDoNothing({
      target: [attendances.enrollmentId, attendances.classSessionId],
    })
    .returning();

  if (!asistencia) {
    // Perdió la carrera: otro request insertó primero. Recuperamos el suyo.
    const [ganador] = await db
      .select({
        id: attendances.id,
        scannedAt: attendances.scannedAt,
        method: attendances.method,
      })
      .from(attendances)
      .where(
        and(
          eq(attendances.enrollmentId, inscripcion.id),
          eq(attendances.classSessionId, clase.id),
        ),
      )
      .limit(1);

    return { tipo: "ya_registrada", existente: ganador, clase };
  }

  return { tipo: "registrada", asistencia, clase };
}

/**
 * Traduce el resultado a una respuesta HTTP. Compartido por scan y manual
 * para que el frontend reciba exactamente los mismos `code` en ambos casos.
 *
 * `alumno` se incluye en la respuesta para que el scanner pueda mostrar
 * "✓ Ana Torres — Karate Infantil" sin una segunda llamada.
 */
export function responderAsistencia(
  resultado: ResultadoAsistencia,
  alumno: { id: string; dni: string; firstName: string; lastName: string },
) {
  switch (resultado.tipo) {
    case "inscripcion_no_activa":
      return fail("INSCRIPCION_VENCIDA", "Inscripción vencida", 409, {
        status: resultado.status,
        alumno,
      });

    case "fuera_de_vigencia":
      return fail(
        "FUERA_DE_VIGENCIA",
        "La inscripción no está vigente en la fecha de hoy",
        409,
        {
          hoy: resultado.hoy,
          startDate: resultado.startDate,
          endDate: resultado.endDate,
          alumno,
        },
      );

    case "clase_inexistente":
      return fail("CLASE_INEXISTENTE", "Clase inexistente", 404);

    case "clase_cerrada":
      return fail(
        "CLASE_CERRADA",
        resultado.status === "CANCELLED"
          ? "La clase está cancelada"
          : "La clase está cerrada",
        409,
        { status: resultado.status, alumno },
      );

    case "ya_registrada":
      return fail("YA_REGISTRADA", "ASISTENCIA YA REGISTRADA", 409, {
        alumno,
        clase: resultado.clase,
        asistencia: resultado.existente,
      });

    case "registrada":
      return ok(
        {
          ...resultado.asistencia,
          alumno,
          clase: resultado.clase,
        },
        201,
      );
  }
}
