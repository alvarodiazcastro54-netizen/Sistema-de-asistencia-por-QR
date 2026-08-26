import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import {
  createStudentSchema,
  listStudentsQuerySchema,
} from "@/lib/validations/students";
import {
  fail,
  failInterno,
  failValidacion,
  leerJson,
  ok,
  pgErrorCode,
} from "@/lib/api";

// ─────────────────────────────────────────────
// POST /api/alumnos → crea un alumno
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await leerJson(req);
  const parsed = createStudentSchema.safeParse(body);

  if (!parsed.success) return failValidacion(parsed.error);

  try {
    const [alumno] = await db.insert(students).values(parsed.data).returning();
    return ok(alumno, 201);
  } catch (e) {
    // 23505 = unique_violation. El único UNIQUE de students es el dni.
    if (pgErrorCode(e) === "23505") {
      return fail("DUPLICADO", "Ya existe un alumno con ese DNI", 409);
    }
    return failInterno("POST /api/alumnos", e);
  }
}

// ─────────────────────────────────────────────
// GET /api/alumnos → lista alumnos
// Filtros opcionales: ?q=texto  ?active=true|false
// ─────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = listStudentsQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    active: searchParams.get("active") ?? undefined,
  });

  if (!parsed.success) return failValidacion(parsed.error);

  const { q, active } = parsed.data;

  try {
    const filtros = [];

    if (q) {
      const patron = `%${q}%`;
      filtros.push(
        or(
          ilike(students.firstName, patron),
          ilike(students.lastName, patron),
          ilike(students.dni, patron),
        ),
      );
    }

    if (active !== undefined) {
      filtros.push(eq(students.active, active === "true"));
    }

    const lista = await db
      .select()
      .from(students)
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(desc(students.createdAt));

    return ok({ total: lista.length, alumnos: lista });
  } catch (e) {
    return failInterno("GET /api/alumnos", e);
  }
}
