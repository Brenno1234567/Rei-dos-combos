"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCartStore } from "../contexts/cartStore";

export interface ProdutoDetalhe {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
}

interface ModalProdutoProps {
  produto: ProdutoDetalhe;
  onClose: () => void;
}

const IMAGEM_PADRAO = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";

const precoFormatado = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function ModalProduto({ produto, onClose }: ModalProdutoProps) {
  const adicionarItem = useCartStore((state) => state.adicionarItem);

  const [quantidade, setQuantidade] = useState(1);

  // Reset quando o produto muda
  useEffect(() => {
    setQuantidade(1);
  }, [produto.id]);

  // Bloqueia scroll do body enquanto aberto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const precoTotal = produto.preco * quantidade;

  function handleAdicionar() {
    for (let i = 0; i < quantidade; i++) {
      adicionarItem({
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
      });
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Fechar"
        >
          <X size={18} className="text-verde-escuro" />
        </button>

        {/* Imagem em destaque */}
        <div className="w-full h-56 sm:h-64 bg-gray-200 overflow-hidden rounded-t-3xl">
          <img
            src={produto.imagem || IMAGEM_PADRAO}
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Conteudo */}
        <div className="p-5 space-y-5">
          {/* Titulo e preco */}
          <div>
            <h2 className="text-xl font-extrabold text-verde-escuro leading-tight pr-8">
              {produto.nome}
            </h2>
            <p className="text-2xl font-extrabold text-verde-normal mt-2">
              {precoFormatado.format(produto.preco)}
            </p>
          </div>

          {/* Descricao */}
          {produto.descricao && (
            <div>
              <h3 className="text-xs font-bold text-cinza-texto uppercase tracking-wider mb-1">
                Descricao
              </h3>
              <p className="text-sm text-verde-escuro/80 leading-relaxed">
                {produto.descricao}
              </p>
            </div>
          )}

          {/* Contador de quantidade */}
          <div>
            <h3 className="text-xs font-bold text-cinza-texto uppercase tracking-wider mb-2">
              Quantidade
            </h3>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                disabled={quantidade <= 1}
                className="p-2 rounded-xl border border-cinza-borda hover:bg-gray-50 disabled:opacity-30 transition-colors"
                aria-label="Diminuir"
              >
                <Minus size={18} className="text-verde-escuro" />
              </button>
              <span className="text-xl font-extrabold text-verde-escuro w-8 text-center">
                {quantidade}
              </span>
              <button
                type="button"
                onClick={() => setQuantidade(Math.min(99, quantidade + 1))}
                className="p-2 rounded-xl border border-cinza-borda hover:bg-gray-50 transition-colors"
                aria-label="Aumentar"
              >
                <Plus size={18} className="text-verde-escuro" />
              </button>
            </div>
          </div>

          {/* Resumo e botao principal */}
          <div className="border-t border-cinza-borda/50 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-cinza-texto font-medium">Total</span>
              <span className="text-xl font-extrabold text-verde-escuro">
                {precoFormatado.format(precoTotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAdicionar}
              className="w-full bg-verde-normal hover:bg-verde-destaque text-white font-bold py-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ShoppingCart size={18} />
              Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
