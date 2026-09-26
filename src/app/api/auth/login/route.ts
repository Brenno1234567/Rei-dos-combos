import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { usuarios } from "../../../../db/schema";
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

    const users = await db.select().from(usuarios);
    let matchedUser = null;

    for (const user of users) {
      const valid = await verifyPin(pin, user.pin);
      if (valid) {
        matchedUser = user;
        break;
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
