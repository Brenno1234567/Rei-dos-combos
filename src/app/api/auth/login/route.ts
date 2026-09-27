import { NextResponse } from "next/server";
import {
  verifyPin,
  setAuthCookies,
  normalizeCargo,
} from "../../../../lib/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  rateLimitError,
  registerFailedLogin,
} from "../../../../lib/login-rate-limit";
import { getFirestoreDb } from "../../../../lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkLoginRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit.retryAfterSeconds!),
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body?.pin || typeof body.pin !== "string") {
      return NextResponse.json({ error: "PIN é obrigatório." }, { status: 400 });
    }

    const pin = body.pin.trim();
    if (pin.length < 4 || pin.length > 32) {
      return NextResponse.json(
        { error: "A senha deve ter entre 4 e 32 caracteres." },
        { status: 400 }
      );
    }

    const db = getFirestoreDb();
    const usersSnapshot = await db.collection("usuarios").get();
    let matchedUser: any = null;

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      if (user.pin) {
        const valid = await verifyPin(pin, user.pin);
        if (valid) {
          matchedUser = { id: doc.id, ...user };
          break;
        }
      }
    }

    if (!matchedUser) {
      const failedAttempt = await registerFailedLogin(request);
      if (!failedAttempt.allowed) {
        return NextResponse.json(
          rateLimitError(failedAttempt.retryAfterSeconds!),
          { status: 429, headers: { "Retry-After": String(failedAttempt.retryAfterSeconds) } }
        );
      }
      return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
    }

    const cargo = normalizeCargo(matchedUser.cargo);
    if (!cargo) {
      return NextResponse.json({ error: "Cargo do usuário inválido." }, { status: 500 });
    }

    await setAuthCookies(cargo);
    await clearLoginRateLimit(request);

    return NextResponse.json({
      success: true,
      cargo,
      nome: matchedUser.nome,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
