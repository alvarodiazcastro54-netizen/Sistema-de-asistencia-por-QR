import { eq } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { uuidSchema } from "@/lib/validations/common";
import { fail, failInterno, failValidacion, ok } from "@/lib/api";

// ─────────────────────────────────────────────
// GET /api/alumnos/[id] → un alumno por id
//
// OJO Next.js 16: `params` es una Promise, hay que await.
// ─────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Sin esto, un id tipo "abc" llega a Postgres y explota como error 500
  // (invalid input syntax for type uuid) en vez de un 400 limpio.
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return failValidacion(parsed.error);

  try {
    const [alumno] = await db
      .select()
      .from(students)
      .where(eq(students.id, parsed.data))
      .limit(1);

    if (!alumno) {
      return fail("NO_ENCONTRADO", "Alumno no encontrado", 404);
    }

    return ok(alumno);
  } catch (e) {
    return failInterno("GET /api/alumnos/[id]", e);
  }
}
