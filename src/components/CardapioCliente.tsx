"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingCart, Home, X, Store, Clock, Bike, Settings } from "lucide-react";
import CardProduto from "./CardProduto";
import ModalProduto, { type ProdutoDetalhe } from "./ModalProduto";
import { useCartStore } from "../contexts/cartStore";

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
}

interface Configuracoes {
  nomeRestaurante?: string;
  statusLoja: boolean;
  tempoPreparo: string;
  whatsapp?: string;
  taxaEntrega?: number;
}

export function CardapioCliente({ mesa }: { mesa?: string }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [isBouncing, setIsBouncing] = useState(false);
  const [isPesquisando, setIsPesquisando] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoDetalhe | null>(null);

  const itensCarrinho = useCartStore((state) => state.itens);
  const definirMesa = useCartStore((state) => state.definirMesa);
  const quantidadeTotal = itensCarrinho.reduce((acc, item) => acc + item.quantidade, 0);

  useEffect(() => {
    if (mesa) definirMesa(mesa);
  }, [definirMesa, mesa]);

  useEffect(() => {
    if (quantidadeTotal > 0) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [quantidadeTotal]);

  useEffect(() => {
    Promise.all([fetch("/api/produtos"), fetch("/api/settings")])
      .then(async ([resProdutos, resConfig]) => {
        const dataProdutos = await resProdutos.json();
        const dataConfig = await resConfig.json();
        setProdutos(Array.isArray(dataProdutos) ? dataProdutos : []);
        setConfig(dataConfig);
      })
      .catch((err) => {
        console.error("Erro ao carregar cardapio:", err);
        setProdutos([]);
      })
      .finally(() => setCarregando(false));
  }, []);

  const alternarPesquisa = () => {
    setIsPesquisando(!isPesquisando);
    if (isPesquisando) setTermoPesquisa("");
  };

  const normalizarTexto = (texto: string | null | undefined) =>
    (texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const categorias = [
    "Todos",
    ...Array.from(new Set(produtos.map((produto) => produto.categoria?.trim()).filter(Boolean))).sort(),
  ];

  const produtosFiltrados = produtos.filter((p) => {
    if (isPesquisando && termoPesquisa.trim() !== "") {
      const termo = normalizarTexto(termoPesquisa);
      return (
        normalizarTexto(p.nome).includes(termo) ||
        normalizarTexto(p.descricao).includes(termo) ||
        normalizarTexto(p.categoria || "").includes(termo)
      );
    }
    if (categoriaAtiva === "Todos") return true;
    return p.categoria?.trim().toLowerCase() === categoriaAtiva.toLowerCase();
  });

  const lojaAberta = config?.statusLoja ?? true;
  const nomeLanchonete = config?.nomeRestaurante || "Rei dos Combos";

  return (
    <div className="min-h-screen bg-fundo flex flex-col relative pb-24 md:pb-0">
      <header className="flex flex-col p-4 md:px-8 sticky top-0 bg-fundo/95 backdrop-blur-sm z-30 border-b border-cinza-borda/40 gap-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="relative shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hidden md:flex p-2.5 bg-verde-normal text-white rounded-xl shadow-md hover:bg-verde-destaque transition-all items-center justify-center"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {isMenuOpen && (
              <div className="absolute left-0 mt-3 w-64 bg-verde-escuro text-white rounded-2xl shadow-2xl p-4 z-50 border border-verde-normal/40">
                <nav className="flex flex-col gap-1.5">
                  <Link href="/cardapio" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium">
                    <Home size={18} /> Cardapio
                  </Link>
                  <button onClick={() => { setIsMenuOpen(false); alternarPesquisa(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium w-full text-left">
                    <Search size={18} /> Pesquisar
                  </button>
                  <Link href="/carrinho" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium">
                    <ShoppingCart size={18} /> Carrinho
                  </Link>
                  <div className="my-1 border-t border-white/10" />
                  <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium text-dourado">
                    <Settings size={18} /> Painel Administrativo
                  </Link>
                </nav>
              </div>
            )}
          </div>

          {/* Nome da Lanchonete */}
          <Link href="/cardapio" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-dourado/20 border border-dourado/40 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Store size={20} className="text-dourado-escuro" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-verde-escuro tracking-tight leading-tight">
                {nomeLanchonete}
              </h1>
              <p className="text-[11px] text-cinza-texto font-medium">Cardapio Online</p>
            </div>
          </Link>

          <div className="flex-1" aria-hidden="true" />

          <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={alternarPesquisa}
              className={`p-2.5 border rounded-xl transition-colors shadow-sm ${isPesquisando ? "bg-verde-escuro text-white border-verde-escuro" : "bg-white border-cinza-borda text-verde-escuro hover:bg-gray-50"}`}
              aria-label="Pesquisar"
            >
              {isPesquisando ? <X size={20} /> : <Search size={20} />}
            </button>

            <Link href="/carrinho" className="relative p-2.5 bg-verde-normal text-white rounded-xl shadow-md hover:bg-verde-destaque transition-colors flex items-center justify-center">
              <ShoppingCart size={20} />
              {quantidadeTotal > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white shadow ${isBouncing ? "animate-bounce" : ""}`}>
                  {quantidadeTotal}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Barra informativa da loja */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-cinza-texto pt-1 border-t border-cinza-borda/30">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full ${lojaAberta ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className={lojaAberta ? "text-emerald-700" : "text-red-600"}>
              {lojaAberta ? "Aberto agora" : "Fechado no momento"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} className="text-dourado-escuro" />
            <span>Preparo: ~{config?.tempoPreparo || "30-45"} min</span>
          </div>
          {config?.taxaEntrega !== undefined && (
            <div className="flex items-center gap-1">
              <Bike size={14} className="text-verde-normal" />
              <span>Entrega: {config.taxaEntrega > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(config.taxaEntrega) : "Gratis / A combinar"}</span>
            </div>
          )}
        </div>

        {isPesquisando && (
          <input
            type="text"
            autoFocus
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
            placeholder="Busque por lanche, porcao, bebida..."
            className="w-full bg-white border-2 border-verde-normal/50 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:border-verde-normal shadow-sm text-verde-escuro placeholder-cinza-texto"
          />
        )}
      </header>

      {!lojaAberta && (
        <div className="mx-4 md:mx-12 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <Store size={18} />
          Estamos fechados no momento. Voce pode ver as opcoes do cardapio, mas pedidos estao temporariamente pausados.
        </div>
      )}

      <main className="flex-1 px-4 md:px-12 py-6 max-w-7xl mx-auto w-full">
        {!isPesquisando && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 mb-6">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium whitespace-nowrap transition-all duration-300 shadow-sm cursor-pointer ${
                  categoriaAtiva === cat
                    ? "bg-verde-normal text-white shadow-md scale-105"
                    : "border border-cinza-borda bg-white text-verde-escuro hover:border-verde-normal"
                }`}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>
        )}

        {carregando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-72 border border-cinza-borda/40 animate-pulse p-4 flex flex-col justify-between">
                <div className="bg-cinza-borda/40 h-40 rounded-xl w-full" />
                <div className="space-y-2 mt-4">
                  <div className="bg-cinza-borda/40 h-4 rounded w-3/4" />
                  <div className="bg-cinza-borda/40 h-3 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-cinza-texto">
            <p className="text-lg">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produtosFiltrados.map((produto) => (
              <CardProduto
                key={produto.id}
                id={produto.id}
                nome={produto.nome}
                descricao={produto.descricao}
                preco={produto.preco}
                imagem={produto.imagem}
                onClick={() => setProdutoSelecionado(produto as ProdutoDetalhe)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Barra de Navegacao Mobile */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-cinza-borda/60 flex justify-around items-center p-3 safe-bottom z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link href="/cardapio" className="flex flex-col items-center text-verde-normal">
          <div className="bg-verde-normal text-white p-2 rounded-full mb-1 shadow">
            <Home size={18} />
          </div>
          <span className="text-[10px] font-bold">Cardapio</span>
        </Link>
        <button onClick={alternarPesquisa} className={`flex flex-col items-center transition-colors ${isPesquisando ? "text-verde-normal" : "text-cinza-texto hover:text-verde-normal"}`}>
          <Search size={20} className="mb-1" />
          <span className="text-[10px] font-medium">Buscar</span>
        </button>
        <Link href="/carrinho" className="flex flex-col items-center text-cinza-texto hover:text-verde-normal transition-colors relative">
          <div className="relative">
            <ShoppingCart size={20} className="mb-1" />
            {quantidadeTotal > 0 && (
              <span className={`absolute -top-1 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${isBouncing ? "animate-bounce" : ""}`}>
                {quantidadeTotal}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Carrinho</span>
        </Link>
      </nav>

      {/* Modal de detalhes do produto */}
      {produtoSelecionado && (
        <ModalProduto
          produto={produtoSelecionado}
          onClose={() => setProdutoSelecionado(null)}
        />
      )}
    </div>
  );
}
