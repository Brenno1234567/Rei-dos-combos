import { createHash } from "node:crypto";
import { getFirestoreDb } from "./firebase-admin";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type LoginAttemptStatus = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  return createHash("sha256").update(ip).digest("hex");
}

function retryAfterSeconds(blockedUntil: number, now: number): number {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
}

export async function checkLoginRateLimit(request: Request): Promise<LoginAttemptStatus> {
  const now = Date.now();
  const identifier = getClientIdentifier(request);

  try {
    const db = getFirestoreDb();
    const doc = await db.collection("tentativasLogin").doc(identifier).get();

    if (!doc.exists) {
      return { allowed: true };
    }

    const data = doc.data();
    if (data?.bloqueadoAte && data.bloqueadoAte > now) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(data.bloqueadoAte, now),
      };
    }
  } catch (error) {
    console.error("Erro ao verificar rate limit:", error);
  }

  return { allowed: true };
}

export async function registerFailedLogin(request: Request): Promise<LoginAttemptStatus> {
  const now = Date.now();
  const identifier = getClientIdentifier(request);
  const lockedUntil = now + LOCKOUT_MS;

  try {
    const db = getFirestoreDb();
    const docRef = db.collection("tentativasLogin").doc(identifier);
    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        identificador: identifier,
        tentativas: 1,
        bloqueadoAte: null,
        atualizadoEm: now,
      });
      return { allowed: true };
    }

    const data = doc.data();
    const tentativasAnteriores = Number(data?.tentativas || 0);
    const novasTentativas = tentativasAnteriores + 1;
    const deveBloquear = novasTentativas >= MAX_FAILED_ATTEMPTS;

    await docRef.set(
      {
        tentativas: novasTentativas,
        bloqueadoAte: deveBloquear ? lockedUntil : null,
        atualizadoEm: now,
      },
      { merge: true }
    );

    if (deveBloquear) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(lockedUntil, now),
      };
    }
  } catch (error) {
    console.error("Erro ao registrar tentativa:", error);
  }

  return { allowed: true };
}

export async function clearLoginRateLimit(request: Request): Promise<void> {
  const identifier = getClientIdentifier(request);
  try {
    const db = getFirestoreDb();
    await db.collection("tentativasLogin").doc(identifier).delete();
  } catch (error) {
    console.error("Erro ao limpar rate limit:", error);
  }
}

export function rateLimitError(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return {
    error: `Muitas tentativas. Tente novamente em ${minutes} minuto${minutes === 1 ? "" : "s"}.`,
    retryAfterSeconds,
  };
}