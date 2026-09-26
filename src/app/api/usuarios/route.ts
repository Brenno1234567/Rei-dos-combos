import { NextResponse } from "next/server";
import { db } from "../../../db";
import { usuarios } from "../../../db/schema";
import { asc } from "drizzle-orm";
import { requireAdmin, isNextResponse, hashPin, normalizeCargo } from "../../../lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const lista = await db.select().from(usuarios).orderBy(asc(usuarios.nome));
    const safe = lista.map(({ pin: _pin, ...rest }) => rest);
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

    if (cargoNormalizado === "admin") {
      const usuariosExistentes = await db.select().from(usuarios);
      const jaExisteAdmin = usuariosExistentes.some(
        (usuario) => normalizeCargo(usuario.cargo) === "admin"
      );

      if (jaExisteAdmin) {
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
    };

    await db.insert(usuarios).values(novoUsuario);

    const { pin: _pin, ...safe } = novoUsuario;
    return NextResponse.json(safe, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return NextResponse.json({ error: "Erro ao cadastrar usuário" }, { status: 500 });
  }
}
