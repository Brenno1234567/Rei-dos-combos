import { NextResponse } from "next/server";
import { isNextResponse, requireAdmin } from "../../../lib/auth";
import { invalidarCacheProdutos } from "../../../lib/produtos-cache";
import { getFirestoreDb } from "../../../lib/firebase-admin";

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

    const db = getFirestoreDb();
    const snapshot = await db.collection("produtos").where("categoria", "==", categoriaAtual).get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { categoria: novaCategoria, atualizadoEm: Date.now() });
    });
    await batch.commit();

    invalidarCacheProdutos();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json({ error: "Não foi possível atualizar a categoria." }, { status: 500 });
  }
}

/** Cria uma nova categoria adicionando um produto placeholder */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    const nomeCategoria = String(body?.nome ?? "").trim();

    if (!nomeCategoria) {
      return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
    }

    const db = getFirestoreDb();
    const snapshot = await db.collection("produtos").where("categoria", "==", nomeCategoria).limit(1).get();

    if (!snapshot.empty) {
      return NextResponse.json({ success: true, message: "Categoria já existe.", jaExistia: true });
    }

    const id = crypto.randomUUID();
    await db.collection("produtos").doc(id).set({
      id,
      nome: `Novo produto (${nomeCategoria})`,
      descricao: "Edite este produto para adicionar detalhes.",
      preco: 0,
      categoria: nomeCategoria,
      status: "Inativo",
      imagem: "",
      criadoEm: Date.now(),
    });

    invalidarCacheProdutos();

    return NextResponse.json({ success: true, id, message: "Categoria criada com sucesso!" }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json({ error: "Não foi possível criar a categoria." }, { status: 500 });
  }
}

/** Remove uma categoria: desativa todos os produtos dessa categoria */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    const categoria = String(body?.categoria ?? "").trim();

    if (!categoria) {
      return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
    }

    const db = getFirestoreDb();
    const snapshot = await db.collection("produtos").where("categoria", "==", categoria).get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: "Inativo", atualizadoEm: Date.now() });
    });
    await batch.commit();

    invalidarCacheProdutos();

    return NextResponse.json({ success: true, message: "Categoria removida e produtos desativados." });
  } catch (error) {
    console.error("Erro ao remover categoria:", error);
    return NextResponse.json({ error: "Não foi possível remover a categoria." }, { status: 500 });
  }
}
