import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type Cargo = "admin" | "cozinha" | "atendente";

export const CARGO_LABELS: Record<Cargo, string> = {
  admin: "Administrador",
  cozinha: "Cozinha",
  atendente: "Atendente",
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
  sameSite: "lax" as const,
};

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function normalizeCargo(cargo: string): Cargo | null {
  const map: Record<string, Cargo> = {
    admin: "admin",
    administrador: "admin",
    cozinha: "cozinha",
    atendente: "atendente",
  };
  return map[cargo.toLowerCase().trim()] ?? null;
}

export async function setAuthCookies(cargo: Cargo): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth_admin");
  cookieStore.delete("auth_cozinha");
  cookieStore.delete("auth_atendente");
  cookieStore.set(`auth_${cargo}`, "1", COOKIE_OPTIONS);
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth_admin");
  cookieStore.delete("auth_cozinha");
  cookieStore.delete("auth_atendente");
}

export async function getAuthRole(): Promise<Cargo | null> {
  const cookieStore = await cookies();
  if (cookieStore.get("auth_admin")) return "admin";
  if (cookieStore.get("auth_cozinha")) return "cozinha";
  if (cookieStore.get("auth_atendente")) return "atendente";
  return null;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export async function requireAuth(
  allowed: Cargo[]
): Promise<{ role: Cargo } | NextResponse> {
  const role = await getAuthRole();
  if (!role) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (role === "admin" || allowed.includes(role)) {
    return { role };
  }
  return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
}

export async function requireAdmin(): Promise<{ role: Cargo } | NextResponse> {
  return requireAuth(["admin"]);
}

export async function requireKitchen(): Promise<{ role: Cargo } | NextResponse> {
  return requireAuth(["admin", "cozinha"]);
}