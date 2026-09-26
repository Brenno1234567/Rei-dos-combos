import { db } from "./index";
import { produtos, configuracoes } from "./schema";

async function seed() {
  console.log("🌱 Populando o banco de dados...");

  await db
    .insert(configuracoes)
    .values({
      id: "config-principal",
      nomeRestaurante: "",
      statusLoja: true,
      tempoPreparo: "30-45",
    })
    .onConflictDoNothing();

  await db
    .insert(produtos)
    .values([
      {
        id: "1",
        nome: "Burger Gourmet",
        descricao:
          "Pão brioche, blend 180g, queijo cheddar derretido, cebola caramelizada e maionese da casa.",
        preco: 38.9,
        categoria: "Lanches",
        status: "Ativo",
      },
      {
        id: "2",
        nome: "Sanduíche de Frango Artesanal",
        descricao:
          "Ciabatta de fermentação natural, filé de frango empanado, alface americana e molho especial.",
        preco: 32.5,
        categoria: "Lanches",
        status: "Ativo",
      },
      {
        id: "3",
        nome: "Batata Doce Rústica",
        descricao:
          "Porção de batatas doces cortadas rusticamente, assadas com alecrim e sal grosso.",
        preco: 22.0,
        categoria: "Acompanhamentos",
        status: "Ativo",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Banco de dados populado com sucesso!");
}

seed().catch((err) => {
  console.error("❌ Erro ao popular o banco:", err);
  process.exit(1);
});
