import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { produtos } from "../../../db/schema";
import { isNextResponse, requireAdmin } from "../../../lib/auth";
import { invalidarCacheProdutos } from "../../../lib/produtos-cache";

/** Renomeia uma categoria em todos os produtos que a utilizam */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    const categoriaAtual = String(body?.categoriaAtual ?? "").trim();
    const novaCategoria = String(body?.novaCategoria ?? "").trim();

    if (!categoriaAtual || !novaCategoria) {
      return NextResponse.json({ error: "Informe o novo nome da categoria." }, { status: 400 });
    }

    if (categoriaAtual === novaCategoria) {
      return NextResponse.json({ success: true, message: "Nenhuma alteração necessária." });
    }

    await db.update(produtos).set({ categoria: novaCategoria }).where(eq(produtos.categoria, categoriaAtual));
    invalidarCacheProdutos();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a categoria." }, { status: 500 });
  }
}

/** Cria uma nova categoria adicionando um produto placeholder (ou apenas registra o nome) */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    const nomeCategoria = String(body?.nome ?? "").trim();

    if (!nomeCategoria) {
      return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
    }

    // Verifica se a categoria já existe
    const existentes = await db.select().from(produtos).where(eq(produtos.categoria, nomeCategoria)).limit(1);
    if (existentes.length > 0) {
      return NextResponse.json({ success: true, message: "Categoria já existe.", jaExistia: true });
    }

    // Cria um produto placeholder que pode ser editado depois
    const id = crypto.randomUUID();
    await db.insert(produtos).values({
      id,
      nome: `Novo produto (${nomeCategoria})`,
      descricao: "Edite este produto para adicionar detalhes.",
      preco: 0,
      categoria: nomeCategoria,
      status: "Inativo",
      imagem: "",
    });
    invalidarCacheProdutos();

    return NextResponse.json({ success: true, id, message: "Categoria criada com sucesso!" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar a categoria." }, { status: 500 });
  }
}

/** Remove uma categoria: renomeia todos os produtos dela para 'Sem Categoria' ou os desativa */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    const categoria = String(body?.categoria ?? "").trim();

    if (!categoria) {
      return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
    }

    // Desativa todos os produtos dessa categoria em vez de excluí-los
    await db.update(produtos).set({ status: "Inativo" }).where(eq(produtos.categoria, categoria));
    invalidarCacheProdutos();

    return NextResponse.json({ success: true, message: "Categoria removida e produtos desativados." });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover a categoria." }, { status: 500 });
  }
}
