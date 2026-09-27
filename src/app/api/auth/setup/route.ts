import { NextResponse } from "next/server";
import { hashPin } from "../../../../lib/auth";
import { getFirestoreDb } from "../../../../lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const setupSecret = process.env.SETUP_SECRET;
    if (setupSecret) {
      const provided = request.headers.get("x-setup-secret");
      if (provided !== setupSecret) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
      }
    }

    const db = getFirestoreDb();
    const existing = await db.collection("usuarios").limit(1).get();
    if (!existing.empty) {
      return NextResponse.json(
        { error: "Setup já realizado. Use o painel de usuários." },
        { status: 403 }
      );
    }

    // Gera um PIN aleatório de 6 dígitos
    const pinGerado = String(Math.floor(100000 + Math.random() * 900000));
    const pinHash = await hashPin(pinGerado);
    const id = crypto.randomUUID();

    await db.collection("usuarios").doc(id).set({
      id,
      nome: "Administrador",
      cargo: "admin",
      pin: pinHash,
      criadoEm: Date.now(),
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
