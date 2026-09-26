import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

function carregarEnv() {
  const env: Record<string, string> = {};
  for (const linha of readFileSync(".env.loadtest", "utf8").split(/\r?\n/)) {
    const texto = linha.trim();
    if (!texto || texto.startsWith("#")) continue;
    const separador = texto.indexOf("=");
    if (separador > 0) env[texto.slice(0, separador)] = texto.slice(separador + 1);
  }
  return env;
}

async function main() {
  const env = carregarEnv();
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error("Crie .env.loadtest com TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.");
  const argumento = process.argv[2] ?? "1000";
  const total = Number(argumento);
  if (argumento !== "--contar" && (!Number.isInteger(total) || total < 1 || total > 10000)) throw new Error("Use um número entre 1 e 10000.");

  const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
  await client.batch([
    { sql: "CREATE TABLE IF NOT EXISTS pedidos (id TEXT PRIMARY KEY, mesa TEXT NOT NULL, cliente TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente', observacao TEXT, total REAL NOT NULL, criado_em INTEGER NOT NULL)" },
    { sql: "CREATE TABLE IF NOT EXISTS itens_pedido (id TEXT PRIMARY KEY, pedido_id TEXT NOT NULL, produto_nome TEXT NOT NULL, quantidade INTEGER NOT NULL, preco_unitario REAL NOT NULL)" },
  ], "write");
  const antes = await client.execute("SELECT COUNT(*) AS total FROM pedidos");
  if (argumento === "--contar") {
    console.log(JSON.stringify({ pedidos_no_banco_de_teste: Number(antes.rows[0].total) }));
    return;
  }

  const inicio = Date.now();
  for (let inicioLote = 0; inicioLote < total; inicioLote += 50) {
    const lote = [];
    const fimLote = Math.min(inicioLote + 50, total);
    for (let i = inicioLote; i < fimLote; i += 1) {
      const pedidoId = crypto.randomUUID();
      const agora = Date.now();
      lote.push(
        { sql: "INSERT INTO pedidos (id, mesa, cliente, status, observacao, total, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [pedidoId, `Teste ${i + 1}`, "Carga temporária", "cancelado", "Pedido automático de teste", 1, agora] },
        { sql: "INSERT INTO itens_pedido (id, pedido_id, produto_nome, quantidade, preco_unitario) VALUES (?, ?, ?, ?, ?)", args: [crypto.randomUUID(), pedidoId, "Item de teste", 1, 1] },
      );
    }
    await client.batch(lote, "write");
  }

  const depois = await client.execute("SELECT COUNT(*) AS total FROM pedidos");
  console.log(JSON.stringify({ pedidos_criados: total, antes: Number(antes.rows[0].total), depois: Number(depois.rows[0].total), segundos: Number(((Date.now() - inicio) / 1000).toFixed(2)) }));
}

main().catch((erro) => { console.error(erro instanceof Error ? erro.message : erro); process.exit(1); });
