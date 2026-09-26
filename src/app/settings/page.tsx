"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Save, Settings, Phone, QrCode, Bike, Store } from "lucide-react";

export default function AdminSettingsPage() {
  const [nomeRestaurante, setNomeRestaurante] = useState("Rei dos Combos");
  const [whatsapp, setWhatsapp] = useState("5514999999999");
  const [chavePix, setChavePix] = useState("");
  const [tipoChavePix, setTipoChavePix] = useState("Aleatória");
  const [taxaEntrega, setTaxaEntrega] = useState("8.00");
  const [statusLoja, setStatusLoja] = useState(true);
  const [tempoPreparo, setTempoPreparo] = useState("30-45");
  const [salvo, setSalvo] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setNomeRestaurante(data.nomeRestaurante || "Rei dos Combos");
        setWhatsapp(data.whatsapp || "5514999999999");
        setChavePix(data.chavePix || "");
        setTipoChavePix(data.tipoChavePix || "Aleatória");
        setTaxaEntrega(Number(data.taxaEntrega ?? 8).toFixed(2));
        setStatusLoja(data.statusLoja ?? true);
        setTempoPreparo(data.tempoPreparo || "30-45");
      })
      .catch(() => alert("Não foi possível carregar as configurações."))
      .finally(() => setCarregando(false));
  }, []);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeRestaurante,
        whatsapp,
        chavePix,
        tipoChavePix,
        taxaEntrega: parseFloat(taxaEntrega.replace(",", ".")) || 0,
        statusLoja,
        tempoPreparo,
      }),
    });
    if (!res.ok) return alert("Erro ao salvar configurações.");
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  }

  if (carregando)
    return (
      <main className="min-h-screen bg-fundo flex items-center justify-center text-verde-escuro font-bold">
        Carregando configurações...
      </main>
    );

  return (
    <div className="min-h-screen bg-fundo flex flex-col pb-16">
      <header className="bg-verde-escuro text-white p-4 md:px-8 flex items-center justify-between gap-3 shadow-md border-b-2 border-dourado/40">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors ring-1 ring-dourado/30">
            <ArrowLeft size={19} />
          </Link>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-dourado">Painel de Controle</p>
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
              <Settings size={19} className="text-dourado" /> Configurações da Lanchonete
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
        <form onSubmit={salvar} className="space-y-6">
          {/* Identificação da Loja */}
          <section className="bg-white p-6 rounded-2xl border border-cinza-borda/70 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-verde-normal/10 text-verde-normal rounded-xl ring-1 ring-dourado/25">
                <Store size={20} />
              </div>
              <div>
                <h2 className="font-bold text-verde-escuro text-lg">Identificação do Estabelecimento</h2>
                <p className="text-xs text-cinza-texto">Nome exibido no cardápio e nas mensagens</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-verde-escuro mb-1.5">
                Nome da Lanchonete
              </label>
              <input
                type="text"
                value={nomeRestaurante}
                onChange={(e) => setNomeRestaurante(e.target.value)}
                placeholder="Ex: Rei dos Combos"
                className="w-full px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 text-verde-escuro font-medium"
                required
              />
            </div>
          </section>

          {/* WhatsApp de Pedidos */}
          <section className="bg-white p-6 rounded-2xl border border-cinza-borda/70 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl ring-1 ring-emerald-300">
                <Phone size={20} />
              </div>
              <div>
                <h2 className="font-bold text-verde-escuro text-lg">WhatsApp para Recebimento de Pedidos</h2>
                <p className="text-xs text-cinza-texto">Número com DDD (ex: 5514999999999 ou 14999999999)</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-verde-escuro mb-1.5">
                Número do WhatsApp (Apenas números)
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 5514999999999"
                className="w-full md:w-1/2 px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 text-verde-escuro font-medium"
                required
              />
              <p className="text-[11px] text-cinza-texto mt-1">
                Ao finalizar o pedido, o cliente será redirecionado para conversar com este número.
              </p>
            </div>
          </section>

          {/* Dados de Pagamento Pix */}
          <section className="bg-white p-6 rounded-2xl border border-cinza-borda/70 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-100 text-cyan-800 rounded-xl ring-1 ring-cyan-300">
                <QrCode size={20} />
              </div>
              <div>
                <h2 className="font-bold text-verde-escuro text-lg">Pagamento via Pix</h2>
                <p className="text-xs text-cinza-texto">Disponibilizada no carrinho para o cliente copiar e pagar</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-verde-escuro mb-1.5">
                  Tipo de Chave Pix
                </label>
                <select
                  value={tipoChavePix}
                  onChange={(e) => setTipoChavePix(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 text-verde-escuro font-medium bg-white"
                >
                  <option value="Aleatória">Aleatória</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="Celular">Celular</option>
                  <option value="E-mail">E-mail</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-verde-escuro mb-1.5">
                  Chave Pix
                </label>
                <input
                  type="text"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder="Cole aqui a sua chave Pix"
                  className="w-full px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 text-verde-escuro font-medium"
                />
              </div>
            </div>
          </section>

          {/* Entrega e Prazos */}
          <section className="bg-white p-6 rounded-2xl border border-cinza-borda/70 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl ring-1 ring-amber-300">
                <Bike size={20} />
              </div>
              <div>
                <h2 className="font-bold text-verde-escuro text-lg">Entrega & Prazos</h2>
                <p className="text-xs text-cinza-texto">Taxa fixa de entrega e tempo estimado</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-verde-escuro mb-1.5">
                  Taxa de Entrega (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-cinza-texto font-bold">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={taxaEntrega}
                    onChange={(e) => setTaxaEntrega(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 text-verde-escuro font-medium"
                    required
                  />
                </div>
                <p className="text-[11px] text-cinza-texto mt-1">
                  Cobrada apenas quando o cliente escolhe a opção "Entrega".
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-verde-escuro mb-1.5">
                  Tempo Médio de Preparo (minutos)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-verde-normal">
                    <Clock size={16} />
                  </span>
                  <input
                    type="text"
                    value={tempoPreparo}
                    onChange={(e) => setTempoPreparo(e.target.value)}
                    placeholder="Ex: 30-45"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 text-verde-escuro font-medium"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Status da Loja */}
          <section className="bg-white p-6 rounded-2xl border border-cinza-borda/70 shadow-sm">
            <h2 className="font-bold text-verde-escuro text-lg mb-1.5">Disponibilidade do Cardápio</h2>
            <p className="text-xs text-cinza-texto mb-5">Controle se a lanchonete está aberta e aceitando pedidos.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStatusLoja(!statusLoja)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  statusLoja ? "bg-verde-normal" : "bg-red-400"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    statusLoja ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-sm font-bold ${statusLoja ? "text-verde-destaque" : "text-red-500"}`}>
                {statusLoja ? "Lanchonete aberta (aceitando pedidos)" : "Lanchonete fechada"}
              </span>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pt-2">
            {salvo && <span className="text-xs font-bold text-dourado-escuro animate-pulse">✓ Configurações salvas com sucesso!</span>}
            <button
              type="submit"
              className="flex items-center gap-2 bg-verde-normal hover:bg-verde-destaque text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Save size={17} /> Salvar alterações
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}