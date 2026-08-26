import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classSessions } from "@/db/schema";
import { uuidSchema } from "@/lib/validations/common";
import { updateClassStatusSchema } from "@/lib/validations/classes";
import { fail, failInterno, failValidacion, leerJson, ok } from "@/lib/api";

// ─────────────────────────────────────────────
// PATCH /api/clases/[id] → abre / cierra / cancela una clase
// Body: { "status": "OPEN" | "CLOSED" | "CANCELLED" }
//
// Solo toca el status: nombre, fecha y horario no se editan.
// No hay reglas de transición, así que una clase CLOSED puede volver a OPEN
// (útil si el profe la cerró por error antes de que llegara un alumno).
// ─────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return failValidacion(parsedId.error);

  const body = await leerJson(req);
  const parsedBody = updateClassStatusSchema.safeParse(body);
  if (!parsedBody.success) return failValidacion(parsedBody.error);

  try {
    // UPDATE ... RETURNING resuelve todo en un solo viaje a la BD:
    // si el array vuelve vacío, la clase no existía.
    const [clase] = await db
      .update(classSessions)
      .set({ status: parsedBody.data.status })
      .where(eq(classSessions.id, parsedId.data))
      .returning();

    if (!clase) {
      return fail("NO_ENCONTRADO", "Clase no encontrada", 404);
    }

    return ok(clase);
  } catch (e) {
    return failInterno("PATCH /api/clases/[id]", e);
  }
}
