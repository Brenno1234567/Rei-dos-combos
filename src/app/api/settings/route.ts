import { NextResponse } from "next/server";
import { db } from "../../../db";
import { configuracoes } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, isNextResponse } from "../../../lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(configuracoes).limit(1);
    return NextResponse.json({
      nomeRestaurante: config?.nomeRestaurante || "Rei dos Combos",
      statusLoja: config?.statusLoja ?? true,
      tempoPreparo: config?.tempoPreparo ?? "30-45",
      whatsapp: config?.whatsapp || "5514999999999",
      chavePix: config?.chavePix || "",
      tipoChavePix: config?.tipoChavePix || "Aleatória",
      taxaEntrega: config?.taxaEntrega ?? 8.0,
    });
  } catch {
    return NextResponse.json({ error: "Erro interno ao buscar configurações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const [existente] = await db.select().from(configuracoes).limit(1);
    const valores = {
      nomeRestaurante: String(body.nomeRestaurante || "Rei dos Combos"),
      statusLoja: Boolean(body.statusLoja ?? true),
      tempoPreparo: String(body.tempoPreparo || "30-45"),
      whatsapp: String(body.whatsapp || "5514999999999").replace(/\D/g, ""),
      chavePix: String(body.chavePix || ""),
      tipoChavePix: String(body.tipoChavePix || "Aleatória"),
      taxaEntrega: Number(body.taxaEntrega ?? 8.0),
    };
    if (!existente) {
      await db.insert(configuracoes).values({ id: "config-principal", ...valores });
    } else {
      await db.update(configuracoes).set(valores).where(eq(configuracoes.id, existente.id));
    }
    return NextResponse.json({ success: true, ...valores });
  } catch {
    return NextResponse.json({ error: "Erro interno ao salvar configurações." }, { status: 500 });
  }
}
