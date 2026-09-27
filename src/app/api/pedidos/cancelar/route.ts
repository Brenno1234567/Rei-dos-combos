import { NextResponse } from "next/server";
import { getFirestoreDb } from "../../../../lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { id, token } = await request.json();
    if (!id || typeof id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

    const db = getFirestoreDb();
    const docRef = db.collection("pedidos").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    const pedido = doc.data()!;

    if (pedido.status !== "pendente") {
      return NextResponse.json({ error: "Este pedido já está em preparo e não pode ser cancelado." }, { status: 409 });
    }

    if (!token || typeof token !== "string" || pedido.tokenCancelamento !== token) {
      return NextResponse.json({ error: "Token de cancelamento inválido. Apenas quem criou o pedido pode cancelá-lo." }, { status: 403 });
    }

    await docRef.set({ status: "cancelado", atualizadoEm: Date.now() }, { merge: true });
    return NextResponse.json({ success: true, message: "Pedido cancelado." });
  } catch (error) {
    console.error("Erro ao cancelar pedido:", error);
    return NextResponse.json({ error: "Não foi possível cancelar o pedido." }, { status: 500 });
  }
}