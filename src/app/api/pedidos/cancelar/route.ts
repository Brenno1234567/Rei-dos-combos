import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { pedidos } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { id, token } = await request.json();
    if (!id || typeof id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

    const pedido = await db.select().from(pedidos).where(eq(pedidos.id, id)).limit(1);
    if (pedido.length === 0) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    if (pedido[0].status !== "pendente") return NextResponse.json({ error: "Este pedido já está em preparo e não pode ser cancelado." }, { status: 409 });

    // Verifica o token de cancelamento para garantir que só o dono do pedido pode cancelar
    if (!token || typeof token !== "string" || pedido[0].tokenCancelamento !== token) {
      return NextResponse.json({ error: "Token de cancelamento inválido. Apenas quem criou o pedido pode cancelá-lo." }, { status: 403 });
    }

    await db.update(pedidos).set({ status: "cancelado" }).where(eq(pedidos.id, id));
    return NextResponse.json({ success: true, message: "Pedido cancelado." });
  } catch (error) {
    console.error("Erro ao cancelar pedido:", error);
    return NextResponse.json({ error: "Não foi possível cancelar o pedido." }, { status: 500 });
  }
}