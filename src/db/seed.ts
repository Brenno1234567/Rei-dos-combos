import { getFirestoreDb } from "../lib/firebase-admin";

async function seed() {
  console.log("Populando o Firestore...");
  const db = getFirestoreDb();

  // 1. Configuracoes
  await db.collection("configuracoes").doc("principal").set(
    {
      nomeRestaurante: "Rei dos Combos",
      statusLoja: true,
      tempoPreparo: "30-45",
      whatsapp: "5514999999999",
      chavePix: "",
      tipoChavePix: "Aleatória",
      taxaEntrega: 8.0,
      atualizadoEm: Date.now(),
    },
    { merge: true }
  );

  // 2. Produtos iniciais
  const produtosIniciais = [
    {
      id: "combo-1",
      nome: "Super Combo Rei Burguer",
      descricao: "Pão brioche, blend 180g, cheddar, bacon crocante, batata frita e refrigerante lata.",
      preco: 39.9,
      categoria: "Combos",
      status: "Ativo",
      imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
      criadoEm: Date.now(),
    },
    {
      id: "combo-2",
      nome: "Combo Duplo Smash",
      descricao: "2 burgers smash 90g, queijo prato duplo, molho especial da casa e batata frita.",
      preco: 34.9,
      categoria: "Combos",
      status: "Ativo",
      imagem: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90",
      criadoEm: Date.now(),
    },
    {
      id: "porcao-1",
      nome: "Batata Frita Especial",
      descricao: "Porção de batatas sequinhas com cheddar cremoso e bacon em cubos.",
      preco: 24.0,
      categoria: "Porções",
      status: "Ativo",
      imagem: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877",
      criadoEm: Date.now(),
    },
    {
      id: "bebida-1",
      nome: "Refrigerante Lata 350ml",
      descricao: "Coca-Cola, Guaraná Antarctica ou Fanta (escolha no pedido).",
      preco: 6.0,
      categoria: "Bebidas",
      status: "Ativo",
      imagem: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97",
      criadoEm: Date.now(),
    },
  ];

  for (const produto of produtosIniciais) {
    await db.collection("produtos").doc(produto.id).set(produto, { merge: true });
  }

  console.log("Firestore populado com sucesso!");
}

seed().catch((err) => {
  console.error("Erro ao popular o banco:", err);
  process.exit(1);
});
