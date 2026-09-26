"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, ChefHat, ShoppingBag, XCircle, Trash2 } from "lucide-react";
import { useCartStore } from "../../contexts/cartStore";

interface Pedido {
  id: string;
  mesa: string;
  cliente: string;
  status: string;
  observacao: string | null;
  total: number;
  criadoEm: string;
}

export default function TelaOrders() {
  const router = useRouter();
  const mesa = useCartStore((state) => state.mesa);
  const [meusPedidos, setMeusPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  const precoFormatado = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const horaFormatada = (data: string) =>
    new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const numeroMesa = mesa?.match(/^Mesa\s+(\d+)$/i)?.[1];
  const cardapioHref = numeroMesa ? `/cardapio/mesa-${numeroMesa}?ativo=1` : "/cardapio";

  const buscarMeusPedidos = async () => {
    try {
      const idsSalvos: { id: string; token?: string }[] = JSON.parse(localStorage.getItem("meusPedidos") || "[]");
      if (idsSalvos.length === 0) {
        setCarregando(false);
        return;
      }

      const ids = idsSalvos.map((p) => p.id);
      const res = await fetch(`/api/pedidos?ids=${encodeURIComponent(ids.join(","))}`);
      const meusPedidosEncontrados: Pedido[] = await res.json();

      setMeusPedidos(Array.isArray(meusPedidosEncontrados) ? meusPedidosEncontrados : []);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    buscarMeusPedidos();
    const intervalo = setInterval(buscarMeusPedidos, 4000);
    return () => clearInterval(intervalo);
  }, []);

  const cancelarPedido = async (id: string) => { if (!window.confirm("Cancelar este pedido?")) return; const salvos: { id: string; token?: string }[] = JSON.parse(localStorage.getItem("meusPedidos") || "[]"); const pedidoSalvo = salvos.find((p) => p.id === id); const r = await fetch("/api/pedidos/cancelar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, token: pedidoSalvo?.token }) }); const d = await r.json(); if (!r.ok) return alert(d.error || "Não foi possível cancelar."); setMeusPedidos((pedidos) => pedidos.map((pedido) => pedido.id === id ? { ...pedido, status: "cancelado" } : pedido)); };

  const excluirDaLista = (id: string) => {
    if (!window.confirm("Remover este pedido da sua lista?")) return;
    const salvos = JSON.parse(localStorage.getItem("meusPedidos") || "[]").filter((pedido: { id: string }) => pedido.id !== id);
    localStorage.setItem("meusPedidos", JSON.stringify(salvos));
    setMeusPedidos((pedidos) => pedidos.filter((pedido) => pedido.id !== id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
            <Clock size={14} /> Aguardando Cozinha
          </span>
        );
      case "preparando":
        return (
          <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
            <ChefHat size={14} /> Em Preparo
          </span>
        );
      case "pronto":
        return (
          <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
            <CheckCircle size={14} /> Pronto para Entrega!
          </span>
        );
      case "cancelado": return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold border border-red-200"><XCircle size={14} /> Cancelado</span>;
      case "entregue":
        return (
          <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
            <CheckCircle size={14} /> Entregue
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-fundo p-4 pb-32 max-w-2xl mx-auto w-full min-w-0">
      {/* Topo */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 min-w-0">
        <button onClick={() => router.push(cardapioHref)} className="bg-white p-2 rounded-xl border border-cinza-borda shadow-sm shrink-0">
          <ArrowLeft size={20} className="text-verde-escuro" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-verde-escuro truncate">Acompanhar Pedidos</h1>
      </div>

      {carregando ? (
        <p className="text-center text-cinza-texto py-20">Carregando seus pedidos...</p>
      ) : meusPedidos.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag size={48} className="mx-auto text-cinza-texto mb-3 opacity-40" />
          <p className="text-cinza-texto font-medium">Você ainda não fez nenhum pedido recente.</p>
          <button 
            onClick={() => router.push(cardapioHref)}
            className="mt-4 bg-verde-normal text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md"
          >
            Ver Cardápio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meusPedidos.map((pedido) => (
            <div key={pedido.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-cinza-borda/60 shadow-sm space-y-3 min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                <div className="min-w-0">
                  <span className="text-xs text-cinza-texto font-medium break-all">Pedido #{pedido.id}</span>
                  <h3 className="font-extrabold text-verde-escuro text-lg truncate">{pedido.mesa}</h3>
                  <p className="text-xs text-cinza-texto truncate">Cliente: {pedido.cliente}</p>
                </div>
                <div className="self-start shrink-0">{getStatusBadge(pedido.status)}</div>
              </div>

              {pedido.observacao && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                  Obs: {pedido.observacao}
                </p>
              )}

              <div className="border-t border-cinza-borda/30 pt-3 flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm">
                <span className="text-cinza-texto">Total: <strong className="text-verde-escuro">{precoFormatado(pedido.total)}</strong></span>
                <span className="text-xs text-cinza-texto shrink-0">Feito às {horaFormatada(pedido.criadoEm)}</span>
                {pedido.status === "pendente" && <button onClick={() => cancelarPedido(pedido.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50"><XCircle size={16} /> Cancelar pedido</button>}
                <button onClick={() => excluirDaLista(pedido.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-cinza-texto font-bold text-sm hover:bg-gray-100"><Trash2 size={16} /> Excluir da lista</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
