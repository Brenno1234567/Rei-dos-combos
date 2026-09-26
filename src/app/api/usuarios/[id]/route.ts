import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { usuarios } from "../../../../db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAdmin, isNextResponse, hashPin, normalizeCargo } from "../../../../lib/auth";

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

    // Valida o PIN: aceita 4 a 8 caracteres (numéricos ou alfanuméricos)
    if (pin !== undefined && pin !== null && pin !== "") {
      const pinStr = String(pin).trim();
      if (pinStr.length < 4 || pinStr.length > 8) {
        return NextResponse.json(
          { error: "O PIN deve ter entre 4 e 8 caracteres." },
          { status: 400 }
        );
      }
    }

    // Normaliza o cargo e valida
    const cargoNormalizado = normalizeCargo(cargo);
    if (!cargoNormalizado) {
      return NextResponse.json({ error: "Cargo inválido." }, { status: 400 });
    }

    // Garante que só exista 1 admin cadastrado (ignorando o próprio usuário sendo editado)
    if (cargoNormalizado === "admin") {
      const outroAdmin = await db
        .select()
        .from(usuarios)
        .where(and(eq(usuarios.cargo, "admin"), ne(usuarios.id, id)));

      if (outroAdmin.length > 0) {
        return NextResponse.json({ error: "Já existe um administrador cadastrado" }, { status: 400 });
      }
    }

    const dadosAtualizados: Record<string, string> = {
      nome: nome.trim(),
      cargo: cargoNormalizado,
    };

    // Se um novo PIN foi fornecido, faz o hash antes de salvar (segurança)
    if (pin && String(pin).trim()) {
      dadosAtualizados.pin = await hashPin(String(pin).trim());
    }

    await db.update(usuarios).set(dadosAtualizados).where(eq(usuarios.id, id));

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
    await db.delete(usuarios).where(eq(usuarios.id, id));
    return NextResponse.json({ success: true, message: "Usuário excluído!" });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 });
  }
}
