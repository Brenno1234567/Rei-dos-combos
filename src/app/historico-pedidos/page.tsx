"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, History, RefreshCw, Trash2 } from "lucide-react";

type Item = { id: string; produtoNome: string; quantidade: number; precoUnitario: number };
type Pedido = {
  id: string;
  mesa: string;
  cliente: string;
  status: string;
  observacao: string | null;
  total: number;
  criadoEm: string;
  itens: Item[];
};

const FILTROS = ["todos", "pendente", "preparando", "pronto", "entregue", "cancelado"];

const STATUS_ESTILO: Record<string, string> = {
  pendente: "bg-dourado-claro text-dourado-escuro border-dourado/40",
  preparando: "bg-verde-claro text-verde-normal border-verde-normal/30",
  pronto: "bg-verde-normal text-white border-verde-normal",
  entregue: "bg-gray-100 text-gray-500 border-gray-200",
  cancelado: "bg-red-50 text-red-500 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  preparando: "Preparando",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function HistoricoPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  const carregar = async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/pedidos");
      const d = await r.json();
      if (Array.isArray(d)) {
        setPedidos(d.sort((a: Pedido, b: Pedido) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()));
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const excluir = async (id: string) => {
    if (!confirm("Excluir este pedido e todos os itens dele?")) return;
    const r = await fetch("/api/pedidos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (r.ok) setPedidos((p) => p.filter((x) => x.id !== id));
    else alert("Não foi possível excluir.");
  };

  const lista = filtro === "todos" ? pedidos : pedidos.filter((p) => p.status === filtro);
  const moeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <main className="min-h-screen bg-fundo p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <header className="flex flex-wrap justify-between items-center gap-4 mb-7">
          <div className="flex gap-3 items-center">
            <Link
              href="/painel-pedidos"
              className="p-2.5 bg-white border border-cinza-borda rounded-xl text-verde-escuro shadow-sm hover:border-dourado/60 hover:bg-dourado-claro/30 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-dourado-escuro mb-0.5">Erva Doce</p>
              <h1 className="flex gap-2 items-center text-2xl font-bold text-verde-escuro">
                <History size={22} className="text-verde-normal" /> Histórico de pedidos
              </h1>
              <p className="text-sm text-cinza-texto">Todos os pedidos feitos.</p>
            </div>
          </div>
          <button
            onClick={carregar}
            className="flex gap-2 items-center px-4 py-2.5 bg-verde-normal text-white rounded-xl font-bold text-sm shadow-sm hover:bg-verde-destaque transition-colors cursor-pointer"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </header>

        <span className="block h-px w-full bg-gradient-to-r from-dourado/50 to-transparent mb-6" />

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
          {FILTROS.map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-colors cursor-pointer ${
                filtro === s
                  ? "bg-verde-normal text-white border-verde-normal shadow-sm"
                  : "bg-white border-cinza-borda text-verde-escuro hover:border-dourado/60"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="text-sm text-cinza-texto mt-6">Carregando...</p>
        ) : lista.length === 0 ? (
          <div className="bg-white border border-dashed border-cinza-borda rounded-2xl p-10 text-center text-cinza-texto text-sm mt-4">
            Nenhum pedido encontrado para este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
            {lista.map((p) => (
              <article
                key={p.id}
                className="bg-white border border-cinza-borda/70 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-dourado/40 transition-all"
              >
                <div className="flex justify-between items-start gap-3 border-b border-cinza-borda/60 pb-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg text-verde-escuro truncate">{p.mesa}</h2>
                    <p className="text-sm text-cinza-texto truncate">{p.cliente}</p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                      STATUS_ESTILO[p.status] ?? "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>

                <p className="text-xs text-cinza-texto my-3">{new Date(p.criadoEm).toLocaleString("pt-BR")}</p>

                <ul className="space-y-2 mb-4">
                  {p.itens.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2 text-sm">
                      <span className="font-semibold text-verde-escuro">
                        {i.quantidade}x {i.produtoNome}
                      </span>
                      <span className="text-cinza-texto shrink-0">{moeda(i.quantidade * i.precoUnitario)}</span>
                    </li>
                  ))}
                </ul>

                {p.observacao && (
                  <p className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-sm mb-4 text-amber-800">
                    <b>Observação:</b> {p.observacao}
                  </p>
                )}

                <div className="flex justify-between items-center border-t border-cinza-borda/60 pt-3">
                  <b className="text-verde-escuro">Total: {moeda(p.total)}</b>
                  <button
                    onClick={() => excluir(p.id)}
                    className="flex gap-1.5 items-center text-red-600 text-sm font-bold hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} /> Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}