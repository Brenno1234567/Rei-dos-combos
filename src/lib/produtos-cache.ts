import { revalidateTag, unstable_cache } from "next/cache";
import { getFirestoreDb } from "./firebase-admin";

const CACHE_TAG = "produtos";

export interface ProdutoItem {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  status: "Ativo" | "Inativo";
  imagem: string;
}

export const listarProdutosAtivosEmCache = unstable_cache(
  async (): Promise<ProdutoItem[]> => {
    const db = getFirestoreDb();
    const snapshot = await db.collection("produtos").where("status", "==", "Ativo").get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome || "",
        descricao: data.descricao || "",
        preco: Number(data.preco || 0),
        categoria: data.categoria || "Geral",
        status: (data.status as "Ativo" | "Inativo") || "Ativo",
        imagem: data.imagem || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      };
    });
  },
  ["produtos-ativos"],
  { revalidate: 300, tags: [CACHE_TAG] }
);

export const listarTodosProdutosEmCache = unstable_cache(
  async (): Promise<ProdutoItem[]> => {
    const db = getFirestoreDb();
    const snapshot = await db.collection("produtos").get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome || "",
        descricao: data.descricao || "",
        preco: Number(data.preco || 0),
        categoria: data.categoria || "Geral",
        status: (data.status as "Ativo" | "Inativo") || "Ativo",
        imagem: data.imagem || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      };
    });
  },
  ["produtos-todos"],
  { revalidate: 300, tags: [CACHE_TAG] }
);

export function invalidarCacheProdutos() {
  try {
    revalidateTag(CACHE_TAG, { expire: 0 });
  } catch {
    // fallback se chamado fora de contexto Next
  }
}
