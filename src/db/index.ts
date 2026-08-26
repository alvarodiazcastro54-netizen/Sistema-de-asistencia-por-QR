import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta la variable de entorno DATABASE_URL (.env.local)");
}

// El constructor de WebSocket es configuración GLOBAL de neon, no del Pool.
// Node 22+ ya trae WebSocket nativo, pero dejarlo explícito evita
// depender de la versión de Node que tenga cada uno del equipo.
neonConfig.webSocketConstructor = ws;

// En dev, Next.js recarga los módulos en cada cambio y se crearía un Pool
// nuevo cada vez, agotando el límite de conexiones de Neon.
// Guardarlo en globalThis lo reutiliza entre recargas.
const globalForDb = globalThis as unknown as {
  neonPool?: Pool;
};

const pool =
  globalForDb.neonPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDb.neonPool = pool;
}

export const db = drizzle(pool, { schema });
