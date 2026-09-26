"use client";
import { useEffect, useState } from "react";
import { CheckCircle, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface Pedido {
  id: string;
  mesa: string;
  cliente: string;
  status: string;
  total: number;
  criadoEm: string;
}

export default function AtendimentoPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarPedidos = async () => {
    try {
      const res = await fetch("/api/pedidos");
      if (!res.ok) throw new Error("Erro ao buscar pedidos.");
      const data = await res.json();
      setPedidos(Array.isArray(data) ? data.filter((pedido) => pedido.status === "pronto") : []);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const primeiraBusca = setTimeout(() => void carregarPedidos(), 0);
    const intervalo = setInterval(carregarPedidos, 5000);
    return () => {
      clearTimeout(primeiraBusca);
      clearInterval(intervalo);
    };
  }, []);

  const finalizarPedido = async (id: string) => {
    const res = await fetch("/api/pedidos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "entregue" }),
    });
    if (res.ok) carregarPedidos();
    else alert("Não foi possível finalizar pedido.");
  };

  const sair = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("erva_doce_user");
    router.push("/login");
  };

  const moeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  return (
    <main className="min-h-screen bg-fundo p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-dourado-escuro mb-1">
              Erva Doce • Salão
            </p>
            <h1 className="text-2xl font-bold text-verde-escuro">Atendimento</h1>
            <p className="text-sm text-cinza-texto">Pedidos prontos para entrega.</p>
            <span className="block h-px w-24 bg-gradient-to-r from-dourado/80 to-transparent mt-3" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={carregarPedidos}
              className="p-2.5 rounded-xl bg-white border border-cinza-borda text-verde-escuro shadow-sm hover:border-dourado/60 hover:bg-dourado-claro/30 transition-colors cursor-pointer"
              aria-label="Atualizar pedidos"
            >
              <RefreshCw size={19} />
            </button>
            <button
              onClick={sair}
              className="p-2.5 rounded-xl bg-verde-escuro text-white shadow-sm hover:bg-verde-normal ring-1 ring-dourado/30 transition-colors cursor-pointer"
              aria-label="Sair"
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>

        {carregando ? (
          <p className="text-sm text-cinza-texto">Carregando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <div className="bg-white border border-dashed border-cinza-borda rounded-2xl p-10 text-center">
            <p className="text-cinza-texto font-medium">Nenhum pedido pronto agora.</p>
            <p className="text-xs text-cinza-texto mt-1">A página atualiza sozinha a cada 5 segundos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pedidos.map((pedido) => (
              <article
                key={pedido.id}
                className="bg-white border border-cinza-borda/70 border-t-[3px] border-t-dourado rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg text-verde-escuro truncate">{pedido.mesa}</h2>
                    <p className="text-sm text-cinza-texto truncate">{pedido.cliente}</p>
                  </div>
                  <span className="text-sm font-extrabold text-verde-normal shrink-0">{moeda(pedido.total)}</span>
                </div>
                <button
                  onClick={() => finalizarPedido(pedido.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-verde-normal text-white font-bold text-sm shadow-sm hover:bg-verde-destaque transition-colors cursor-pointer"
                >
                  <CheckCircle size={17} /> Entregar pedido
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}