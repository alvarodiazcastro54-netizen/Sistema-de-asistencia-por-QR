import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ─────────────────────────────────────────────
// Formato único de respuesta para toda la API.
// Mayerli (scanner) y Álvaro (admin) siempre reciben la misma forma:
//   éxito  → { ok: true,  data: ... }
//   error  → { ok: false, code: "...", error: "mensaje legible" }
//
// El campo `code` es para que el frontend reaccione sin leer el texto
// (ej: pintar rojo si code === "YA_REGISTRADA").
// ─────────────────────────────────────────────

export type ApiCode =
  // genéricos
  | "VALIDACION"
  | "NO_ENCONTRADO"
  | "DUPLICADO"
  | "ERROR_INTERNO"
  // específicos del scan de asistencia
  | "QR_INVALIDO"
  | "INSCRIPCION_VENCIDA"
  | "FUERA_DE_VIGENCIA"
  | "CLASE_INEXISTENTE"
  | "CLASE_CERRADA"
  | "YA_REGISTRADA";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(
  code: ApiCode,
  error: string,
  status: number,
  detalles?: unknown,
) {
  return NextResponse.json(
    { ok: false, code, error, ...(detalles ? { detalles } : {}) },
    { status },
  );
}

/**
 * Convierte los issues de Zod en un objeto { campo: "mensaje" }
 * mucho más fácil de mostrar en un formulario.
 */
export function zodDetalles(err: ZodError) {
  const detalles: Record<string, string> = {};
  for (const issue of err.issues) {
    const campo = issue.path.join(".") || "_";
    if (!detalles[campo]) detalles[campo] = issue.message;
  }
  return detalles;
}

/** Error de validación de Zod → 400 con el detalle por campo. */
export function failValidacion(err: ZodError) {
  return fail("VALIDACION", "Datos inválidos", 400, zodDetalles(err));
}

/** Código de error de Postgres, si lo hay (23505 = unique violation). */
export function pgErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * Último recurso: loguea en servidor y devuelve 500 sin filtrar
 * detalles internos de la base de datos al cliente.
 */
export function failInterno(contexto: string, e: unknown) {
  console.error(`[API] ${contexto}:`, e);
  return fail("ERROR_INTERNO", "Error interno del servidor", 500);
}

/** Lee el body JSON tolerando body vacío o malformado. */
export async function leerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
