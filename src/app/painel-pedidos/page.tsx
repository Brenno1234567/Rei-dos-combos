"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Users, Settings, LogOut, Pencil, CheckCircle, Clock, History } from "lucide-react";
import { pusherClient } from "../../lib/pusher";

interface ItemPedido {
  id: string;
  produtoNome: string;
  quantidade: number;
}

interface Pedido {
  id: string;
  mesa: string;
  cliente: string;
  status: string;
  observacao: string | null;
  total: number;
  criadoEm: string;
  itens: ItemPedido[];
}

export default function PainelPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  const horaFormatada = (data: string) =>
    new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const carregarPedidos = async () => {
    try {
      const res = await fetch("/api/pedidos");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPedidos(data);
      }
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  useEffect(() => {
    const client = pusherClient;
    if (!client) return;

    const channel = client.subscribe("canal-restaurante");

    channel.bind("novo-pedido", (data: any) => {
      carregarPedidos();
      console.log(data.mensagem);
    });

    channel.bind("status-atualizado", (data: any) => {
      carregarPedidos();
    });

    return () => {
      client.unsubscribe("canal-restaurante");
    };
  }, []);

  async function atualizarStatus(id: string, novoStatus: string) {
    try {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: novoStatus }),
      });
      if (res.ok) {
        carregarPedidos();
      } else {
        alert("Erro ao atualizar o pedido.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("erva_doce_user");
      router.push("/login");
    } catch (error) {
      console.error("Erro ao tentar sair:", error);
    }
  };

  const novos = pedidos.filter((p) => p.status === "pendente");
  const emPreparo = pedidos.filter((p) => p.status === "preparando");
  const prontos = pedidos.filter((p) => p.status === "pronto");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-fundo">
      {/* ─── Sidebar desktop ─── */}
      <aside className="hidden md:flex w-20 bg-verde-escuro flex-col items-center justify-between py-6 shrink-0 border-r border-dourado/25">
        <div className="flex flex-col items-center gap-6">
          {/* Monograma Erva Doce */}
          <div
            className="w-11 h-11 rounded-full bg-gradient-to-br from-dourado-claro to-dourado flex items-center justify-center text-verde-escuro font-serif font-bold text-xl shadow-md ring-1 ring-dourado/40"
            title="Erva Doce"
          >
            E
          </div>
          <nav className="flex flex-col gap-2 text-white/60">
            <Link
              href="/painel-pedidos"
              className="bg-verde-normal p-3 rounded-xl text-white shadow-md ring-1 ring-dourado/50"
              title="Painel de Pedidos"
            >
              <ClipboardList size={22} />
            </Link>
            <Link
              href="/users"
              className="p-3 hover:text-dourado hover:bg-white/10 rounded-xl transition-colors"
              title="Gerenciar Equipe"
            >
              <Users size={22} />
            </Link>
            <Link
              href="/historico-pedidos"
              className="p-3 hover:text-dourado hover:bg-white/10 rounded-xl transition-colors"
              title="Histórico"
            >
              <History size={22} />
            </Link>
            <Link
              href="/settings"
              className="p-3 hover:text-dourado hover:bg-white/10 rounded-xl transition-colors"
              title="Configurações"
            >
              <Settings size={22} />
            </Link>
            <Link
              href="/admin"
              className="p-3 hover:text-dourado hover:bg-white/10 rounded-xl transition-colors"
              title="Cardápio"
            >
              <Pencil size={22} />
            </Link>
          </nav>
        </div>
        <div className="flex flex-col gap-2 text-white/60">
          <button
            onClick={handleLogout}
            className="p-3 hover:text-dourado hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut size={22} />
          </button>
        </div>
      </aside>

      {/* ─── Conteúdo ─── */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 min-w-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-dourado-escuro mb-1">
              Erva Doce • Cozinha
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-verde-escuro">Painel de pedidos</h1>
            <p className="text-xs sm:text-sm text-cinza-texto mt-1 max-w-xl">
              Acompanhe o preparo em tempo real. Quando o pedido for concluído e pago, aperte em finalizar.
            </p>
            <span className="block h-px w-24 bg-gradient-to-r from-dourado/80 to-transparent mt-3" />
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-cinza-texto">Carregando pedidos...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 min-w-0 items-start">
            {/* ═══ NOVOS PEDIDOS ═══ */}
            <section className="bg-verde-claro/40 p-4 rounded-2xl border border-verde-claro min-w-0">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-dourado/30">
                <h3 className="font-bold text-verde-escuro flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-dourado shrink-0" /> Novos pedidos
                </h3>
                <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-verde-escuro shadow-sm border border-dourado/30">
                  {novos.length}
                </span>
              </div>

              {novos.length === 0 && (
                <p className="text-center py-8 text-sm text-cinza-texto bg-white/60 rounded-xl border border-dashed border-cinza-borda">
                  Nenhum pedido novo no momento.
                </p>
              )}

              {novos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-cinza-borda/50 mb-3 min-w-0 hover:shadow-md hover:border-dourado/40 transition-all"
                >
                  <div className="flex justify-between items-center gap-2 mb-1 min-w-0">
                    <span className="font-bold text-verde-escuro text-lg truncate">{pedido.mesa}</span>
                    <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1 shrink-0">
                      <Clock size={12} /> {horaFormatada(pedido.criadoEm)}
                    </span>
                  </div>
                  <p className="text-xs text-cinza-texto mb-3 truncate">{pedido.cliente}</p>
                  <ul className="mb-4 space-y-1.5">
                    {pedido.itens?.map((item) => (
                      <li
                        key={item.id}
                        className="text-sm font-bold text-verde-escuro flex justify-between gap-2 border-b border-cinza-borda/30 pb-1.5 min-w-0"
                      >
                        <span className="break-words">
                          {item.quantidade}x {item.produtoNome}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {pedido.observacao && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg mb-3 border border-red-100 font-medium">
                      Atenção - Obs: {pedido.observacao}
                    </p>
                  )}
                  <button
                    onClick={() => atualizarStatus(pedido.id, "preparando")}
                    className="w-full bg-verde-normal text-white py-2.5 rounded-lg text-sm font-bold hover:bg-verde-destaque transition-colors shadow-sm cursor-pointer"
                  >
                    Iniciar preparo
                  </button>
                </div>
              ))}
            </section>

            {/* ═══ EM PREPARO ═══ */}
            <section className="bg-verde-claro/40 p-4 rounded-2xl border border-verde-claro min-w-0">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-dourado/30">
                <h3 className="font-bold text-verde-escuro flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-verde-normal shrink-0" /> Em preparo
                </h3>
                <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-verde-escuro shadow-sm border border-dourado/30">
                  {emPreparo.length}
                </span>
              </div>

              {emPreparo.length === 0 && (
                <p className="text-center py-8 text-sm text-cinza-texto bg-white/60 rounded-xl border border-dashed border-cinza-borda">
                  Nada em preparo agora.
                </p>
              )}

              {emPreparo.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white p-4 rounded-xl shadow-sm border-2 border-verde-normal mb-3 min-w-0 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-center gap-2 mb-1 min-w-0">
                    <span className="font-bold text-verde-escuro text-lg truncate">{pedido.mesa}</span>
                    <span className="text-[11px] text-verde-normal font-semibold flex items-center gap-1 shrink-0">
                      <Clock size={12} /> {horaFormatada(pedido.criadoEm)}
                    </span>
                  </div>
                  <p className="text-xs text-cinza-texto mb-3 truncate">{pedido.cliente}</p>
                  <ul className="mb-4 space-y-1.5 opacity-80">
                    {pedido.itens?.map((item) => (
                      <li key={item.id} className="text-sm font-semibold text-verde-escuro min-w-0">
                        <span className="break-words">
                          {item.quantidade}x {item.produtoNome}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => atualizarStatus(pedido.id, "pronto")}
                    className="w-full bg-verde-claro text-verde-escuro py-2.5 rounded-lg text-sm font-bold border border-verde-normal hover:bg-verde-normal hover:text-white transition-colors cursor-pointer"
                  >
                    Marcar como pronto
                  </button>
                </div>
              ))}
            </section>

            {/* ═══ PRONTOS ═══ */}
            <section className="bg-verde-claro/40 p-4 rounded-2xl border border-verde-claro min-w-0">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-dourado/30">
                <h3 className="font-bold text-verde-escuro flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-verde-destaque shrink-0" /> Prontos
                </h3>
                <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-verde-escuro shadow-sm border border-dourado/30">
                  {prontos.length}
                </span>
              </div>

              {prontos.length === 0 && (
                <p className="text-center py-8 text-sm text-cinza-texto bg-white/60 rounded-xl border border-dashed border-cinza-borda">
                  Nenhum pedido pronto ainda.
                </p>
              )}

              {prontos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-cinza-borda/50 border-t-[3px] border-t-dourado mb-3 min-w-0 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-center gap-2 mb-1 min-w-0">
                    <span className="font-bold text-verde-escuro text-lg truncate">{pedido.mesa}</span>
                    <span className="text-[11px] text-green-600 font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle size={12} /> Pronto
                    </span>
                  </div>
                  <p className="text-xs text-cinza-texto mb-3 truncate">{pedido.cliente}</p>
                  <button
                    onClick={() => atualizarStatus(pedido.id, "entregue")}
                    className="w-full text-xs text-verde-normal font-bold cursor-pointer hover:text-verde-destaque hover:underline text-left transition-colors"
                  >
                    Finalizar (entregue) →
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}
      </main>

      {/* ─── Navegação mobile ─── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-verde-escuro border-t border-dourado/25 flex justify-around items-center p-2 safe-bottom z-30">
        <Link href="/painel-pedidos" className="flex flex-col items-center gap-0.5 p-2 text-dourado">
          <ClipboardList size={20} />
          <span className="text-[10px] font-bold">Pedidos</span>
        </Link>
        <Link href="/users" className="flex flex-col items-center gap-0.5 p-2 text-white/70">
          <Users size={20} />
          <span className="text-[10px] font-medium">Equipe</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-0.5 p-2 text-white/70">
          <Settings size={20} />
          <span className="text-[10px] font-medium">Config</span>
        </Link>
        <Link href="/admin" className="flex flex-col items-center gap-0.5 p-2 text-white/70">
          <Pencil size={20} />
          <span className="text-[10px] font-medium">Cardápio</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 p-2 text-white/70">
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Sair</span>
        </button>
      </nav>
    </div>
  );
}