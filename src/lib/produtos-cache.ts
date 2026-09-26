import { revalidateTag, unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { produtos } from "../db/schema";

const CACHE_TAG = "produtos";

export const listarProdutosAtivosEmCache = unstable_cache(
  () => db.select().from(produtos).where(eq(produtos.status, "Ativo")),
  ["produtos-ativos"],
  { revalidate: 300, tags: [CACHE_TAG] }
);

export const listarTodosProdutosEmCache = unstable_cache(
  () => db.select().from(produtos),
  ["produtos-todos"],
  { revalidate: 300, tags: [CACHE_TAG] }
);

export function invalidarCacheProdutos() {
  revalidateTag(CACHE_TAG, { expire: 0 });
}
