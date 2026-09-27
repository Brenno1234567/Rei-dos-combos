import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "../../../lib/auth";
import { getFirestoreDb } from "../../../lib/firebase-admin";

const CONFIG_DOC_ID = "principal";

export async function GET() {
  try {
    const db = getFirestoreDb();
    const doc = await db.collection("configuracoes").doc(CONFIG_DOC_ID).get();
    const data = doc.exists ? doc.data() : null;

    return NextResponse.json({
      nomeRestaurante: data?.nomeRestaurante || "Rei dos Combos",
      statusLoja: data?.statusLoja ?? true,
      tempoPreparo: data?.tempoPreparo ?? "30-45",
      whatsapp: data?.whatsapp || "5514999999999",
      chavePix: data?.chavePix || "",
      tipoChavePix: data?.tipoChavePix || "Aleatória",
      taxaEntrega: Number(data?.taxaEntrega ?? 8.0),
    });
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json({ error: "Erro interno ao buscar configurações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

    const valores = {
      nomeRestaurante: String(body.nomeRestaurante || "Rei dos Combos"),
      statusLoja: Boolean(body.statusLoja ?? true),
      tempoPreparo: String(body.tempoPreparo || "30-45"),
      whatsapp: String(body.whatsapp || "5514999999999").replace(/\D/g, ""),
      chavePix: String(body.chavePix || ""),
      tipoChavePix: String(body.tipoChavePix || "Aleatória"),
      taxaEntrega: Number(body.taxaEntrega ?? 8.0),
      atualizadoEm: Date.now(),
    };

    const db = getFirestoreDb();
    await db.collection("configuracoes").doc(CONFIG_DOC_ID).set(valores, { merge: true });

    return NextResponse.json({ success: true, ...valores });
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json({ error: "Erro interno ao salvar configurações." }, { status: 500 });
  }
}
