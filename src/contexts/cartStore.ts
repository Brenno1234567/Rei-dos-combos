import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ItemCarrinho {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string | null;
}

/** Gera uma chave única para o item no carrinho */
function chaveItem(item: Pick<ItemCarrinho, "id">): string {
  return item.id;
}

interface CartState {
  itens: ItemCarrinho[];
  mesa: string | null;
  adicionarItem: (produto: {
    id: string;
    nome: string;
    preco: number;
  }) => void;
  removerItem: (id: string) => void;
  alterarQuantidade: (id: string, quantidade: number) => void;
  limparCarrinho: () => void;
  definirMesa: (mesa: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      itens: [],
      mesa: null,

      adicionarItem: (produto) =>
        set((state) => {
          const chave = chaveItem(produto);
          const itemExiste = state.itens.find((item) => chaveItem(item) === chave);

          if (itemExiste) {
            return {
              itens: state.itens.map((item) =>
                chaveItem(item) === chave
                  ? { ...item, quantidade: item.quantidade + 1 }
                  : item
              ),
            };
          }

          return {
            itens: [
              ...state.itens,
              {
                id: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: 1,
              },
            ],
          };
        }),

      removerItem: (id) =>
        set((state) => {
          return { itens: state.itens.filter((item) => chaveItem(item) !== id) };
        }),

      alterarQuantidade: (id, quantidade) =>
        set((state) => {
          if (quantidade <= 0) {
            return { itens: state.itens.filter((item) => chaveItem(item) !== id) };
          }
          return {
            itens: state.itens.map((item) =>
              chaveItem(item) === id ? { ...item, quantidade } : item
            ),
          };
        }),

      limparCarrinho: () => set({ itens: [] }),
      definirMesa: (mesa) => set({ mesa }),
    }),
    { name: "rei-dos-combos-cart" }
  )
);
