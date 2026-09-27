import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse, hashPin, normalizeCargo } from "../../../lib/auth";
import { getFirestoreDb } from "../../../lib/firebase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const db = getFirestoreDb();
    const snapshot = await db.collection("usuarios").orderBy("nome", "asc").get();
    const safe = snapshot.docs.map((doc) => {
      const { pin: _pin, ...rest } = doc.data();
      return { id: doc.id, ...rest };
    });
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json().catch(() => null);
    const { nome, cargo, pin } = body ?? {};

    if (!nome?.trim() || !pin || !cargo) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const cargoNormalizado = normalizeCargo(cargo);
    if (!cargoNormalizado) {
      return NextResponse.json({ error: "Cargo inválido." }, { status: 400 });
    }

    const db = getFirestoreDb();

    if (cargoNormalizado === "admin") {
      const adminSnapshot = await db.collection("usuarios").where("cargo", "==", "admin").limit(1).get();
      if (!adminSnapshot.empty) {
        return NextResponse.json(
          { error: "Já existe um administrador cadastrado." },
          { status: 409 }
        );
      }
    }

    const pinStr = String(pin).trim();
    if (pinStr.length < 4 || pinStr.length > 32) {
      return NextResponse.json(
        { error: "A senha deve ter entre 4 e 32 caracteres." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const pinHash = await hashPin(pinStr);

    const novoUsuario = {
      id,
      nome: nome.trim(),
      cargo: cargoNormalizado,
      pin: pinHash,
      criadoEm: Date.now(),
    };

    await db.collection("usuarios").doc(id).set(novoUsuario);

    const { pin: _pin, ...safe } = novoUsuario;
    return NextResponse.json(safe, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return NextResponse.json({ error: "Erro ao cadastrar usuário" }, { status: 500 });
  }
}
