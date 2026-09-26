import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { usuarios } from "../../../../db/schema";
import { hashPin } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const setupSecret = process.env.SETUP_SECRET;
    if (setupSecret) {
      const provided = request.headers.get("x-setup-secret");
      if (provided !== setupSecret) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
      }
    }

    const existing = await db.select().from(usuarios).limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Setup já realizado. Use o painel de usuários." },
        { status: 403 }
      );
    }

    // Gera um PIN aleatório de 6 dígitos em vez de um valor fixo e previsível.
    const pinGerado = String(Math.floor(100000 + Math.random() * 900000));
    const pinHash = await hashPin(pinGerado);

    await db.insert(usuarios).values({
      id: crypto.randomUUID(),
      nome: "Administrador",
      cargo: "admin",
      pin: pinHash,
    });

    return NextResponse.json({
      success: true,
      message: `Admin criado. Use o PIN ${pinGerado} para entrar (anote agora, ele não será mostrado de novo). Troque-o pelo painel de usuários assim que possível.`,
      pin: pinGerado,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
  }
}
