import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse, hashPin, normalizeCargo } from "../../../../lib/auth";
import { getFirestoreDb } from "../../../../lib/firebase-admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }
    const { nome, cargo, pin } = body as { nome?: string; cargo?: string; pin?: string };

    if (!nome?.trim() || !cargo) {
      return NextResponse.json({ error: "Nome e cargo são obrigatórios" }, { status: 400 });
    }

    if (pin !== undefined && pin !== null && pin !== "") {
      const pinStr = String(pin).trim();
      if (pinStr.length < 4 || pinStr.length > 32) {
        return NextResponse.json(
          { error: "A senha deve ter entre 4 e 32 caracteres." },
          { status: 400 }
        );
      }
    }

    const cargoNormalizado = normalizeCargo(cargo);
    if (!cargoNormalizado) {
      return NextResponse.json({ error: "Cargo inválido." }, { status: 400 });
    }

    const db = getFirestoreDb();

    if (cargoNormalizado === "admin") {
      const adminSnapshot = await db.collection("usuarios").where("cargo", "==", "admin").get();
      const outroAdmin = adminSnapshot.docs.find((doc) => doc.id !== id);
      if (outroAdmin) {
        return NextResponse.json({ error: "Já existe um administrador cadastrado." }, { status: 400 });
      }
    }

    const dadosAtualizados: Record<string, any> = {
      nome: nome.trim(),
      cargo: cargoNormalizado,
      atualizadoEm: Date.now(),
    };

    if (pin && String(pin).trim()) {
      dadosAtualizados.pin = await hashPin(String(pin).trim());
    }

    await db.collection("usuarios").doc(id).set(dadosAtualizados, { merge: true });

    return NextResponse.json({ success: true, message: "Usuário atualizado!" });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  try {
    const { id } = await params;
    const db = getFirestoreDb();
    await db.collection("usuarios").doc(id).delete();
    return NextResponse.json({ success: true, message: "Usuário excluído!" });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 });
  }
}
