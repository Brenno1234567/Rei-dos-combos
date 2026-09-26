"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Minus,
  Plus,
  ArrowLeft,
  ShoppingCart,
  Bike,
  Store,
  QrCode,
  CreditCard,
  Banknote,
  Copy,
  Check,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { useCartStore } from "../../contexts/cartStore";

interface Configuracoes {
  nomeRestaurante?: string;
  statusLoja: boolean;
  tempoPreparo: string;
  whatsapp?: string;
  chavePix?: string;
  tipoChavePix?: string;
  taxaEntrega?: number;
}

function ConteudoCarrinho() {
  const router = useRouter();
  const { itens, alterarQuantidade, limparCarrinho } = useCartStore();

  const [config, setConfig] = useState<Configuracoes | null>(null);

  // Dados do pedido
  const [tipoPedido, setTipoPedido] = useState<"entrega" | "retirada">("entrega");
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao_credito" | "cartao_debito" | "dinheiro">("pix");
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [trocoPara, setTrocoPara] = useState("");
  const [observacao, setObservacao] = useState("");

  const [chaveCopiada, setChaveCopiada] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error("Erro ao carregar configuracoes:", err));
  }, []);

  const subtotal = itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const taxaEntrega = tipoPedido === "entrega" ? (config?.taxaEntrega ?? 8) : 0;
  const total = subtotal + taxaEntrega;

  const precoFormatado = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const copiarChavePix = () => {
    if (!config?.chavePix) return;
    navigator.clipboard.writeText(config.chavePix);
    setChaveCopiada(true);
    setTimeout(() => setChaveCopiada(false), 2500);
  };

  const formatarMensagemWhatsApp = () => {
    const nomeLoja = config?.nomeRestaurante || "REI DOS COMBOS";
    const linhas: string[] = [];

    linhas.push(`*NOVO PEDIDO - ${nomeLoja.toUpperCase()}*`);
    linhas.push(`----------------------------------`);
    linhas.push(`*Cliente:* ${cliente.trim()}`);
    if (telefone.trim()) linhas.push(`*WhatsApp:* ${telefone.trim()}`);
    linhas.push(`*Tipo:* ${tipoPedido === "entrega" ? "Entrega (Delivery)" : "Retirada no Balcao"}`);

    if (tipoPedido === "entrega") {
      linhas.push(`*Endereco:* ${endereco.trim()}`);
      linhas.push(`*Bairro:* ${bairro.trim()}`);
      if (complemento.trim()) linhas.push(`*Complemento:* ${complemento.trim()}`);
      if (pontoReferencia.trim()) linhas.push(`*Referencia:* ${pontoReferencia.trim()}`);
    }

    linhas.push(`----------------------------------`);
    linhas.push(`*ITENS DO PEDIDO:*`);
    itens.forEach((i) => {
      const itemTotal = precoFormatado(i.preco * i.quantidade);
      linhas.push(`- *${i.quantidade}x* ${i.nome} - ${itemTotal}`);
    });

    if (observacao.trim()) {
      linhas.push(``);
      linhas.push(`*Observacoes:* ${observacao.trim()}`);
    }

    linhas.push(`----------------------------------`);
    linhas.push(`Subtotal: ${precoFormatado(subtotal)}`);
    if (tipoPedido === "entrega") {
      linhas.push(`Taxa de Entrega: ${taxaEntrega > 0 ? precoFormatado(taxaEntrega) : "Gratis"}`);
    }
    linhas.push(`*TOTAL: ${precoFormatado(total)}*`);
    linhas.push(`----------------------------------`);

    let descPagamento = "";
    if (formaPagamento === "pix") {
      descPagamento = "Pix (Comprovante em anexo)";
    } else if (formaPagamento === "cartao_credito") {
      descPagamento = "Cartao de Credito (Levar maquininha)";
    } else if (formaPagamento === "cartao_debito") {
      descPagamento = "Cartao de Debito (Levar maquininha)";
    } else if (formaPagamento === "dinheiro") {
      if (precisaTroco && trocoPara.trim()) {
        descPagamento = `Dinheiro (Troco para R$ ${trocoPara.trim()})`;
      } else {
        descPagamento = "Dinheiro (Sem troco)";
      }
    }
    linhas.push(`*Forma de Pagamento:* ${descPagamento}`);
    linhas.push(`----------------------------------`);
    linhas.push(`Pedido realizado via Cardapio Digital`);

    return linhas.join("\n");
  };

  async function finalizarPedido() {
    if (config && !config.statusLoja) {
      return alert("A lanchonete esta fechada no momento para novos pedidos.");
    }
    if (itens.length === 0) {
      return alert("Seu carrinho esta vazio!");
    }
    if (!cliente.trim()) {
      return alert("Por favor, digite o seu nome.");
    }

    if (tipoPedido === "entrega") {
      if (!endereco.trim()) {
        return alert("Por favor, informe seu endereco de entrega (rua e numero).");
      }
      if (!bairro.trim()) {
        return alert("Por favor, informe seu bairro.");
      }
    }

    if (formaPagamento === "dinheiro" && precisaTroco) {
      const valorTroco = parseFloat(trocoPara.replace(",", "."));
      if (isNaN(valorTroco) || valorTroco <= total) {
        return alert(`O valor para troco deve ser maior que o total do pedido (${precoFormatado(total)}).`);
      }
    }

    setEnviando(true);

    try {
      // 1. Salva no banco de dados para controle interno
      await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente,
          telefone,
          tipoPedido,
          endereco: tipoPedido === "entrega" ? endereco : null,
          bairro: tipoPedido === "entrega" ? bairro : null,
          complemento: tipoPedido === "entrega" ? complemento : null,
          pontoReferencia: tipoPedido === "entrega" ? pontoReferencia : null,
          formaPagamento,
          trocoPara: precisaTroco ? trocoPara : null,
          observacao,
          itens: itens.map((i) => ({
            id: i.id,
            nome: i.nome,
            quantidade: i.quantidade,
            preco: i.preco,
          })),
        }),
      }).catch((e) => console.warn("Erro ao registrar no banco:", e));

      // 2. Prepara o numero do WhatsApp
      let numeroWhats = (config?.whatsapp || "5514999999999").replace(/\D/g, "");
      if (numeroWhats.length === 10 || numeroWhats.length === 11) {
        numeroWhats = `55${numeroWhats}`;
      }

      // 3. Monta a mensagem e abre o WhatsApp
      const mensagem = formatarMensagemWhatsApp();
      const urlWhats = `https://wa.me/${numeroWhats}?text=${encodeURIComponent(mensagem)}`;

      limparCarrinho();

      // Redireciona para o WhatsApp
      window.location.href = urlWhats;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao processar pedido.");
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-fundo p-4 pb-40 max-w-2xl mx-auto w-full min-w-0">
      {/* Topo */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 min-w-0">
        <button
          onClick={() => router.push("/cardapio")}
          className="bg-white p-2.5 rounded-xl border border-cinza-borda shadow-sm hover:border-dourado/60 transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft size={20} className="text-verde-escuro" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-black text-verde-escuro truncate">Seu Carrinho</h1>
          <p className="text-xs text-cinza-texto">{config?.nomeRestaurante || "Rei dos Combos"}</p>
        </div>
      </div>

      {itens.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cinza-borda/50 p-8 shadow-sm">
          <ShoppingCart size={54} className="mx-auto text-cinza-texto mb-3 opacity-40" />
          <h2 className="text-base font-bold text-verde-escuro mb-1">Seu carrinho esta vazio</h2>
          <p className="text-cinza-texto text-sm mb-6">Que tal escolher um lanche delicioso agora?</p>
          <button
            onClick={() => router.push("/cardapio")}
            className="bg-verde-normal text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-verde-destaque transition-colors cursor-pointer"
          >
            Ver Cardapio
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Lista de Itens */}
          <div className="space-y-3">
            {itens.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-cinza-borda/60 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-verde-escuro text-sm sm:text-base truncate">{item.nome}</h3>
                  <p className="text-xs text-cinza-texto mt-1">
                    Qtd: {item.quantidade}x - {precoFormatado(item.preco)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span className="font-extrabold text-verde-normal text-sm sm:text-base">
                    {precoFormatado(item.preco * item.quantidade)}
                  </span>
                  <div className="flex items-center border border-cinza-borda rounded-xl overflow-hidden bg-fundo">
                    <button
                      onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                      className="p-2 text-verde-escuro hover:bg-verde-claro/40 transition-colors"
                      aria-label="Diminuir"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="min-w-7 text-center text-xs font-bold text-verde-escuro">
                      {item.quantidade}
                    </span>
                    <button
                      onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                      className="p-2 text-verde-escuro hover:bg-verde-claro/40 transition-colors"
                      aria-label="Aumentar"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Opcao de Entrega ou Retirada */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-cinza-borda/60 shadow-sm space-y-4">
            <h3 className="font-bold text-verde-escuro text-sm flex items-center gap-2">
              <Bike size={18} className="text-verde-normal" /> Como deseja receber?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoPedido("entrega")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  tipoPedido === "entrega"
                    ? "border-verde-normal bg-verde-claro/20 text-verde-escuro font-bold shadow-sm"
                    : "border-cinza-borda bg-fundo text-cinza-texto hover:border-cinza-borda"
                }`}
              >
                <Bike size={24} className={tipoPedido === "entrega" ? "text-verde-normal mb-1" : "mb-1 text-cinza-texto"} />
                <span className="text-xs sm:text-sm">Entrega (Delivery)</span>
                <span className="text-[10px] mt-0.5 font-normal">
                  {config?.taxaEntrega ? `+ ${precoFormatado(config.taxaEntrega)}` : "+ R$ 8,00"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTipoPedido("retirada")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  tipoPedido === "retirada"
                    ? "border-verde-normal bg-verde-claro/20 text-verde-escuro font-bold shadow-sm"
                    : "border-cinza-borda bg-fundo text-cinza-texto hover:border-cinza-borda"
                }`}
              >
                <Store size={24} className={tipoPedido === "retirada" ? "text-verde-normal mb-1" : "mb-1 text-cinza-texto"} />
                <span className="text-xs sm:text-sm">Retirar no Balcao</span>
                <span className="text-[10px] mt-0.5 font-normal text-emerald-700">Sem taxa</span>
              </button>
            </div>
          </div>

          {/* Dados do Cliente e Endereco */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-cinza-borda/60 shadow-sm space-y-4">
            <h3 className="font-bold text-verde-escuro text-sm">Seus Dados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-cinza-texto mb-1 font-semibold">Seu Nome *</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full bg-fundo p-3 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-cinza-texto mb-1 font-semibold">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  placeholder="Ex: (14) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full bg-fundo p-3 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro"
                />
              </div>
            </div>

            {tipoPedido === "entrega" && (
              <div className="pt-2 border-t border-cinza-borda/40 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-verde-escuro flex items-center gap-1.5">
                  <MapPin size={14} className="text-verde-normal" /> Endereco de Entrega
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-cinza-texto mb-1 font-semibold">Rua e Numero *</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Brasil, 450"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full bg-fundo p-3 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cinza-texto mb-1 font-semibold">Bairro *</label>
                    <input
                      type="text"
                      placeholder="Ex: Centro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full bg-fundo p-3 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-cinza-texto mb-1 font-semibold">Complemento (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Apto 32 / Bloco B"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full bg-fundo p-3 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-cinza-texto mb-1 font-semibold">Ponto de Referencia (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Proximo a padaria"
                      value={pontoReferencia}
                      onChange={(e) => setPontoReferencia(e.target.value)}
                      className="w-full bg-fundo p-3 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-cinza-texto mb-1 font-semibold">Observacoes do Pedido (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Sem cebola, carne bem passada, etc."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full bg-fundo p-3 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro"
              />
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-cinza-borda/60 shadow-sm space-y-4">
            <h3 className="font-bold text-verde-escuro text-sm">Forma de Pagamento</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setFormaPagamento("pix")}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  formaPagamento === "pix"
                    ? "border-cyan-600 bg-cyan-50 text-cyan-900 font-bold shadow-sm"
                    : "border-cinza-borda bg-fundo text-cinza-texto"
                }`}
              >
                <QrCode size={20} className={formaPagamento === "pix" ? "text-cyan-600 mb-1" : "mb-1 text-cinza-texto"} />
                <span className="text-xs">Pix</span>
              </button>

              <button
                type="button"
                onClick={() => setFormaPagamento("cartao_credito")}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  formaPagamento === "cartao_credito"
                    ? "border-verde-normal bg-verde-claro/20 text-verde-escuro font-bold shadow-sm"
                    : "border-cinza-borda bg-fundo text-cinza-texto"
                }`}
              >
                <CreditCard size={20} className={formaPagamento === "cartao_credito" ? "text-verde-normal mb-1" : "mb-1 text-cinza-texto"} />
                <span className="text-xs">Credito</span>
              </button>

              <button
                type="button"
                onClick={() => setFormaPagamento("cartao_debito")}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  formaPagamento === "cartao_debito"
                    ? "border-verde-normal bg-verde-claro/20 text-verde-escuro font-bold shadow-sm"
                    : "border-cinza-borda bg-fundo text-cinza-texto"
                }`}
              >
                <CreditCard size={20} className={formaPagamento === "cartao_debito" ? "text-verde-normal mb-1" : "mb-1 text-cinza-texto"} />
                <span className="text-xs">Debito</span>
              </button>

              <button
                type="button"
                onClick={() => setFormaPagamento("dinheiro")}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  formaPagamento === "dinheiro"
                    ? "border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-sm"
                    : "border-cinza-borda bg-fundo text-cinza-texto"
                }`}
              >
                <Banknote size={20} className={formaPagamento === "dinheiro" ? "text-amber-600 mb-1" : "mb-1 text-cinza-texto"} />
                <span className="text-xs">Dinheiro</span>
              </button>
            </div>

            {/* Detalhes do Pix */}
            {formaPagamento === "pix" && config?.chavePix && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-900">
                    Chave Pix ({config.tipoChavePix || "Chave"}):
                  </span>
                  <button
                    type="button"
                    onClick={copiarChavePix}
                    className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-cyan-200 shadow-xs"
                  >
                    {chaveCopiada ? (
                      <>
                        <Check size={14} className="text-emerald-600" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copiar Chave
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs bg-white p-2 rounded-lg border border-cyan-200 text-cyan-950 select-all break-all">
                  {config.chavePix}
                </p>
                <p className="text-[11px] text-cyan-800">
                  Voce pode copiar a chave agora para pagar no seu banco e enviar o comprovante pelo WhatsApp.
                </p>
              </div>
            )}

            {/* Detalhes do Dinheiro com Troco */}
            {formaPagamento === "dinheiro" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={precisaTroco}
                    onChange={(e) => setPrecisaTroco(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  Precisa de troco?
                </label>

                {precisaTroco && (
                  <div>
                    <label className="block text-xs text-amber-900 mb-1 font-semibold">Troco para quanto?</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-amber-800 font-bold">R$</span>
                      <input
                        type="text"
                        placeholder="Ex: 50,00 ou 100,00"
                        value={trocoPara}
                        onChange={(e) => setTrocoPara(e.target.value)}
                        className="w-full bg-white pl-9 pr-3 py-2 rounded-lg border border-amber-300 text-sm focus:outline-none focus:border-amber-600 text-amber-950 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {(formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito") && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                A maquininha sera levada ate voce na entrega ou passada no balcao da lanchonete.
              </div>
            )}
          </div>

          {/* Resumo e Botao de Enviar WhatsApp */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-cinza-borda p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl z-20">
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs text-cinza-texto">
                  <span>Subtotal:</span>
                  <span>{precoFormatado(subtotal)}</span>
                </div>
                {tipoPedido === "entrega" && (
                  <div className="flex justify-between items-center text-xs text-cinza-texto">
                    <span>Taxa de Entrega:</span>
                    <span>{taxaEntrega > 0 ? precoFormatado(taxaEntrega) : "Gratis"}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-cinza-borda/40">
                  <span className="text-sm font-bold text-verde-escuro">Total do Pedido:</span>
                  <span className="text-xl font-black text-verde-escuro">{precoFormatado(total)}</span>
                </div>
              </div>

              <button
                onClick={finalizarPedido}
                disabled={enviando}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <MessageCircle size={22} className="fill-white" />
                {enviando ? "Abrindo WhatsApp..." : "Finalizar Pedido pelo WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TelaCarrinho() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-fundo flex items-center justify-center text-verde-escuro font-bold">
          Carregando carrinho...
        </main>
      }
    >
      <ConteudoCarrinho />
    </Suspense>
  );
}
