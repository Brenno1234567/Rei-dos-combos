import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { produtos } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, isNextResponse } from "../../../../lib/auth";
import { invalidarCacheProdutos } from "../../../../lib/produtos-cache";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body?.nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }

    const preco = Number(body.preco);
    if (isNaN(preco) || preco < 0) {
      return NextResponse.json({ error: "Preço inválido." }, { status: 400 });
    }

    await db
      .update(produtos)
      .set({
        nome: body.nome.trim(),
        descricao: String(body.descricao ?? "").trim(),
        preco,
        categoria: body.categoria || "Geral",
        imagem: body.imagem?.trim() || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        status: body.status === "Inativo" ? "Inativo" : "Ativo",
      })
      .where(eq(produtos.id, id));
    invalidarCacheProdutos();

    return NextResponse.json({ success: true, message: "Produto atualizado!" });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 });
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
    await db.delete(produtos).where(eq(produtos.id, id));
    invalidarCacheProdutos();
    return NextResponse.json({ success: true, message: "Produto excluído com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json({ error: "Erro ao excluir produto" }, { status: 500 });
  }
}
