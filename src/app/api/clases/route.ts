import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { classSessions } from "@/db/schema";
import {
  createClassSessionSchema,
  listClassSessionsQuerySchema,
} from "@/lib/validations/classes";
import { failInterno, failValidacion, leerJson, ok } from "@/lib/api";

// ─────────────────────────────────────────────
// POST /api/clases → crea una clase
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await leerJson(req);
  const parsed = createClassSessionSchema.safeParse(body);

  if (!parsed.success) return failValidacion(parsed.error);

  try {
    const [clase] = await db
      .insert(classSessions)
      .values(parsed.data)
      .returning();

    return ok(clase, 201);
  } catch (e) {
    return failInterno("POST /api/clases", e);
  }
}

// ─────────────────────────────────────────────
// GET /api/clases → lista clases
// Filtros opcionales, combinables:
//   ?date=2026-08-26            un día exacto
//   ?from=2026-08-01&to=2026-08-31   rango
//   ?status=OPEN
//
// El scanner de Mayerli necesita justamente ?date=hoy&status=OPEN
// para poblar el selector de clase.
// ─────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = listClassSessionsQuerySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) return failValidacion(parsed.error);

  const { date, from, to, status } = parsed.data;

  try {
    const filtros = [];

    if (date) filtros.push(eq(classSessions.classDate, date));
    if (from) filtros.push(gte(classSessions.classDate, from));
    if (to) filtros.push(lte(classSessions.classDate, to));
    if (status) filtros.push(eq(classSessions.status, status));

    const lista = await db
      .select()
      .from(classSessions)
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(desc(classSessions.classDate), desc(classSessions.startTime));

    return ok({ total: lista.length, clases: lista });
  } catch (e) {
    return failInterno("GET /api/clases", e);
  }
}
