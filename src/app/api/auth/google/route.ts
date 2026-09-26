import { NextResponse } from "next/server";
import { setAuthCookies } from "../../../../lib/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  rateLimitError,
  registerFailedLogin,
} from "../../../../lib/login-rate-limit";

export const runtime = "nodejs";

interface FirebaseAccount {
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
}

function allowedAdminEmails() {
  return new Set(
    (process.env.GOOGLE_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkLoginRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit.retryAfterSeconds!),
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Token Google inválido." }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) throw new Error("Firebase ainda não configurado.");

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    const accountData = await response.json();
    const account = accountData.users?.[0] as FirebaseAccount | undefined;
    const email = account?.email?.toLowerCase();

    if (!response.ok || !email || !account?.emailVerified || !allowedAdminEmails().has(email)) {
      const failedAttempt = await registerFailedLogin(request);
      if (!failedAttempt.allowed) {
        return NextResponse.json(
          rateLimitError(failedAttempt.retryAfterSeconds!),
          { status: 429, headers: { "Retry-After": String(failedAttempt.retryAfterSeconds) } }
        );
      }
      return NextResponse.json({ error: "Esta conta Google não tem acesso." }, { status: 403 });
    }

    await setAuthCookies("admin");
    await clearLoginRateLimit(request);
    return NextResponse.json({ success: true, cargo: "admin", nome: account?.displayName ?? email });
  } catch (error) {
    console.error("Erro no login Google:", error);
    return NextResponse.json({ error: "Não foi possível validar login Google." }, { status: 401 });
  }
}
