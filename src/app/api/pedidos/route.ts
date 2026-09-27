import { NextResponse } from "next/server";
import { requireKitchen, requireAuth, isNextResponse } from "../../../lib/auth";
import { pusherServer } from "../../../lib/pusher-server";
import { getFirestoreDb } from "../../../lib/firebase-admin";

interface ItemPedidoInput {
  id?: string;
  nome: string;
  quantidade: number;
  preco: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const db = getFirestoreDb();

    // Cliente sem login: só pode buscar os próprios pedidos, informando os IDs
    if (idsParam !== null) {
      const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (ids.length === 0) {
        return NextResponse.json([]);
      }

      const pedidosList: any[] = [];
      for (const id of ids) {
        const doc = await db.collection("pedidos").doc(id).get();
        if (doc.exists) {
          pedidosList.push({ id: doc.id, ...doc.data() });
        }
      }

      return NextResponse.json(pedidosList);
    }

    // Listagem completa: só a equipe pode ver todos os pedidos.
    const auth = await requireAuth(["admin", "cozinha", "atendente"]);
    if (isNextResponse(auth)) return auth;

    const snapshot = await db.collection("pedidos").orderBy("criadoEm", "desc").get();
    const pedidosComItens = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(pedidosComItens);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    return NextResponse.json({ error: "Erro interno ao buscar pedidos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getFirestoreDb();
    const configDoc = await db.collection("configuracoes").doc("principal").get();
    const configData = configDoc.data();

    if (configDoc.exists && configData?.statusLoja === false) {
      return NextResponse.json(
        { error: "A loja está fechada no momento. Tente novamente mais tarde." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      mesa,
      cliente,
      telefone,
      tipoPedido,
      endereco,
      bairro,
      complemento,
      pontoReferencia,
      formaPagamento,
      trocoPara,
      observacao,
      itens,
    } = body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: "O pedido precisa conter pelo menos um item." }, { status: 400 });
    }

    const ids = (itens as ItemPedidoInput[])
      .map((i) => i.id)
      .filter((id): id is string => typeof id === "string");

    const produtoMap = new Map<string, any>();
    if (ids.length > 0) {
      for (const id of ids) {
        const pDoc = await db.collection("produtos").doc(id).get();
        if (pDoc.exists) {
          produtoMap.set(id, pDoc.data());
        }
      }
    }

    let totalCalculado = 0;

    for (const item of itens as ItemPedidoInput[]) {
      if (!item.nome || typeof item.nome !== "string" || item.nome.trim() === "") {
        return NextResponse.json({ error: "Todos os itens devem ter um nome válido." }, { status: 400 });
      }

      if (typeof item.quantidade !== "number" || item.quantidade <= 0 || item.quantidade > 99) {
        return NextResponse.json(
          { error: `Quantidade inválida para "${item.nome}".` },
          { status: 400 }
        );
      }

      if (item.id && produtoMap.has(item.id)) {
        const produto = produtoMap.get(item.id)!;
        if (produto.status !== "Ativo") {
          return NextResponse.json(
            { error: `"${produto.nome}" não está disponível no momento.` },
            { status: 400 }
          );
        }
        totalCalculado += Number(produto.preco) * item.quantidade;
      } else if (typeof item.preco === "number" && item.preco >= 0) {
        totalCalculado += item.preco * item.quantidade;
      } else {
        return NextResponse.json({ error: `Preço inválido para "${item.nome}".` }, { status: 400 });
      }
    }

    if (totalCalculado <= 0) {
      return NextResponse.json({ error: "O valor total do pedido deve ser maior que zero." }, { status: 400 });
    }

    const mesaRecebida = String(mesa || "").trim();
    const numeroMesa = /^Mesa\s+(\d{1,3})$/i.exec(mesaRecebida);
    const tipo = tipoPedido || (numeroMesa ? "mesa" : "entrega");
    const mesaFormatada = numeroMesa ? `Mesa ${numeroMesa[1]}` : (tipo === "retirada" ? "Balcão" : (mesaRecebida || "Delivery"));
    const clienteFormatado = String(cliente || "Cliente").trim().substring(0, 100);
    const obsFormatada = String(observacao || "").trim().substring(0, 255);

    const pedidoId = crypto.randomUUID();
    const tokenCancelamento = crypto.randomUUID();
    const criadoEm = Date.now();

    const itensParaSalvar = (itens as ItemPedidoInput[]).map((item) => {
      const produto = item.id ? produtoMap.get(item.id) : undefined;
      const precoUnitario = produto?.preco ?? Number(item.preco);

      return {
        id: crypto.randomUUID(),
        produtoNome: produto?.nome ?? item.nome.trim(),
        quantidade: Number(item.quantidade),
        precoUnitario,
      };
    });

    const novoPedido = {
      id: pedidoId,
      mesa: mesaFormatada,
      cliente: clienteFormatado,
      status: "pendente",
      observacao: obsFormatada,
      total: totalCalculado,
      criadoEm,
      tokenCancelamento,
      telefone: telefone ? String(telefone).trim() : null,
      tipoPedido: tipo,
      endereco: endereco ? String(endereco).trim() : null,
      bairro: bairro ? String(bairro).trim() : null,
      complemento: complemento ? String(complemento).trim() : null,
      pontoReferencia: pontoReferencia ? String(pontoReferencia).trim() : null,
      formaPagamento: formaPagamento ? String(formaPagamento).trim() : null,
      trocoPara: trocoPara ? String(trocoPara).trim() : null,
      itens: itensParaSalvar,
    };

    await db.collection("pedidos").doc(pedidoId).set(novoPedido);

    // Dispara o sinal do Pusher após salvar no banco
    try {
      await pusherServer?.trigger("canal-restaurante", "novo-pedido", {
        mensagem: "Você tem um novo pedido!",
      });
    } catch (pusherError) {
      console.error("Erro ao enviar sinal via Pusher (Novo Pedido):", pusherError);
    }

    return NextResponse.json(
      { success: true, pedidoId, tokenCancelamento, total: totalCalculado, message: "Pedido criado com sucesso!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro no processamento do pedido:", error);
    return NextResponse.json({ error: "Erro interno ao salvar o pedido." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireKitchen();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);

    if (!body?.id || !body?.status) {
      return NextResponse.json({ error: "É necessário fornecer id e status." }, { status: 400 });
    }

    const { id, status } = body;
    const statusValidos = ["pendente", "preparando", "pronto", "entregue", "cancelado"];
    const statusFormatado = String(status).toLowerCase();

    if (!statusValidos.includes(statusFormatado)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${statusValidos.join(", ")}` },
        { status: 400 }
      );
    }

    const db = getFirestoreDb();
    await db.collection("pedidos").doc(String(id)).set(
      { status: statusFormatado, atualizadoEm: Date.now() },
      { merge: true }
    );

    try {
      await pusherServer?.trigger("canal-restaurante", "status-atualizado", {
        id: String(id),
        status: statusFormatado,
      });
    } catch (pusherError) {
      console.error("Erro ao enviar sinal via Pusher (Status Atualizado):", pusherError);
    }

    return NextResponse.json({ success: true, message: "Status atualizado!" });
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar status." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireKitchen();
  if (isNextResponse(auth)) return auth;
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "ID do pedido obrigatorio." }, { status: 400 });
  try {
    const db = getFirestoreDb();
    await db.collection("pedidos").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir pedido." }, { status: 500 });
  }
}
