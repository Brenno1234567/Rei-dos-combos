import { createHash } from "node:crypto";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { tentativasLogin } from "../db/schema";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type LoginAttemptStatus = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

let tableReady: Promise<void> | undefined;

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  return createHash("sha256").update(ip).digest("hex");
}

async function ensureTable(): Promise<void> {
  tableReady ??= db.run(sql`
    CREATE TABLE IF NOT EXISTS tentativas_login (
      identificador TEXT PRIMARY KEY,
      tentativas INTEGER NOT NULL DEFAULT 0,
      bloqueado_ate INTEGER,
      atualizado_em INTEGER NOT NULL
    )
  `).then(() => undefined);

  await tableReady;
}

function retryAfterSeconds(blockedUntil: number, now: number): number {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
}

export async function checkLoginRateLimit(request: Request): Promise<LoginAttemptStatus> {
  await ensureTable();

  const now = Date.now();
  const identifier = getClientIdentifier(request);
  
  // Consulta segura usando o Drizzle ORM compatível com LibSQL
  const rows = await db
    .select({
      bloqueadoAte: tentativasLogin.bloqueadoAte,
    })
    .from(tentativasLogin)
    .where(eq(tentativasLogin.identificador, identifier))
    .limit(1);

  const attempt = rows[0];

  if (attempt?.bloqueadoAte && attempt.bloqueadoAte > now) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(attempt.bloqueadoAte, now),
    };
  }

  return { allowed: true };
}

export async function registerFailedLogin(request: Request): Promise<LoginAttemptStatus> {
  await ensureTable();

  const now = Date.now();
  const identifier = getClientIdentifier(request);
  const lockedUntil = now + LOCKOUT_MS;

  await db.run(sql`
    INSERT INTO tentativas_login (identificador, tentativas, bloqueado_ate, atualizado_em)
    VALUES (${identifier}, 1, NULL, ${now})
    ON CONFLICT(identificador) DO UPDATE SET
      tentativas = CASE
        WHEN tentativas_login.bloqueado_ate IS NOT NULL
          AND tentativas_login.bloqueado_ate > ${now}
          THEN tentativas_login.tentativas
        WHEN tentativas_login.bloqueado_ate IS NOT NULL THEN 1
        ELSE tentativas_login.tentativas + 1
      END,
      bloqueado_ate = CASE
        WHEN tentativas_login.bloqueado_ate IS NOT NULL
          AND tentativas_login.bloqueado_ate > ${now}
          THEN tentativas_login.bloqueado_ate
        WHEN tentativas_login.bloqueado_ate IS NOT NULL THEN NULL
        WHEN tentativas_login.tentativas + 1 >= ${MAX_FAILED_ATTEMPTS}
          THEN ${lockedUntil}
        ELSE NULL
      END,
      atualizado_em = ${now}
  `);

  return checkLoginRateLimit(request);
}

export async function clearLoginRateLimit(request: Request): Promise<void> {
  await ensureTable();

  await db.run(sql`
    DELETE FROM tentativas_login
    WHERE identificador = ${getClientIdentifier(request)}
  `);
}

export function rateLimitError(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return {
    error: `Muitas tentativas. Tente novamente em ${minutes} minuto${minutes === 1 ? "" : "s"}.`,
    retryAfterSeconds,
  };
}