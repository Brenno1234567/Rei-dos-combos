"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit3, X, Utensils, ArrowLeft, Image as ImageIcon, Power, PowerOff, Check, Tag, Settings } from "lucide-react";

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
  status?: "Ativo" | "Inativo";
}

export default function PainelAdmin() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Modal de edicao
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditandoId, setProdutoEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState("Lanches");
  const [imagem, setImagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");

  const precoFormatado = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const categoriasDisponiveis = Array.from(
    new Set(produtos.map((produto) => produto.categoria?.trim()).filter(Boolean))
  ).sort();

  const carregarProdutos = async () => {
    try {
      const res = await fetch("/api/produtos");
      const data = await res.json();
      if (Array.isArray(data)) setProdutos(data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const abrirModalNovo = () => {
    setProdutoEditandoId(null);
    setNome("");
    setDescricao("");
    setPreco("");
    setCategoria("Lanches");
    setImagem("");
    setStatus("Ativo");
    setModalAberto(true);
  };

  const abrirModalEdicao = (produto: Produto) => {
    setProdutoEditandoId(produto.id);
    setNome(produto.nome);
    setDescricao(produto.descricao || "");
    setPreco(produto.preco.toString());
    setCategoria(produto.categoria || "Lanches");
    setImagem(produto.imagem || "");
    setStatus(produto.status === "Inativo" ? "Inativo" : "Ativo");
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setProdutoEditandoId(null);
    setNome("");
    setDescricao("");
    setPreco("");
    setCategoria("Lanches");
    setImagem("");
    setStatus("Ativo");
  };

  const handleUploadImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFazendoUpload(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) setImagem(data.url);
      else alert("Erro ao fazer upload da imagem.");
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro de conexao ao enviar imagem.");
    } finally {
      setFazendoUpload(false);
    }
  };

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !preco) return alert("Preencha o nome e o preco do produto!");
    if (fazendoUpload) return alert("Aguarde o envio da imagem terminar!");
    setSalvando(true);
    try {
      const url = produtoEditandoId ? `/api/produtos/${produtoEditandoId}` : "/api/produtos";
      const method = produtoEditandoId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao,
          preco: Number(preco),
          categoria,
          imagem: imagem.trim() || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
          status,
        }),
      });
      if (res.ok) {
        fecharModal();
        carregarProdutos();
      } else {
        alert("Erro ao salvar produto.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexao.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusProduto(produto: Produto) {
    const novoStatus = produto.status === "Inativo" ? "Ativo" : "Inativo";
    try {
      const res = await fetch(`/api/produtos/${produto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: produto.nome,
          descricao: produto.descricao,
          preco: produto.preco,
          categoria: produto.categoria,
          imagem: produto.imagem,
          status: novoStatus,
        }),
      });
      if (res.ok) {
        carregarProdutos();
      } else {
        alert("Erro ao atualizar disponibilidade do produto.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexao.");
    }
  }

  async function excluirProduto(id: string) {
    if (!confirm("Tem certeza que deseja remover este item do cardapio?")) return;
    try {
      const res = await fetch(`/api/produtos/${id}`, { method: "DELETE" });
      if (res.ok) {
        carregarProdutos();
      } else {
        alert("Erro ao excluir produto.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexao.");
    }
  }

  // Gerenciamento de Categorias
  const [categoriaEditando, setCategoriaEditando] = useState<string | null>(null);
  const [categoriaEditValor, setCategoriaEditValor] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [mostrarInputCategoria, setMostrarInputCategoria] = useState(false);

  async function salvarEdicaoCategoria(categoriaAtual: string) {
    const novoNome = categoriaEditValor.trim();
    if (!novoNome || novoNome === categoriaAtual) {
      setCategoriaEditando(null);
      return;
    }
    setSalvandoCategoria(true);
    try {
      const res = await fetch("/api/categorias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoriaAtual, novaCategoria: novoNome }),
      });
      if (!res.ok) {
        alert("Nao foi possivel editar a categoria.");
      } else {
        if (categoria === categoriaAtual) setCategoria(novoNome);
        carregarProdutos();
      }
    } catch {
      alert("Erro de conexao ao editar categoria.");
    } finally {
      setSalvandoCategoria(false);
      setCategoriaEditando(null);
    }
  }

  async function criarCategoria() {
    const nomeCategoria = novaCategoriaNome.trim();
    if (!nomeCategoria) return;
    setCriandoCategoria(true);
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeCategoria }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Nao foi possivel criar a categoria.");
      } else {
        setNovaCategoriaNome("");
        setMostrarInputCategoria(false);
        setCategoria(nomeCategoria);
        carregarProdutos();
      }
    } catch {
      alert("Erro de conexao ao criar categoria.");
    } finally {
      setCriandoCategoria(false);
    }
  }

  return (
    <div className="min-h-screen bg-fundo p-4 sm:p-6 md:p-10">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => router.push("/cardapio")}
            className="bg-white p-2.5 rounded-xl border border-cinza-borda shadow-sm hover:border-dourado/60 hover:bg-dourado-claro/30 transition-colors shrink-0 cursor-pointer"
            title="Voltar ao Cardapio"
          >
            <ArrowLeft size={20} className="text-verde-escuro" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-dourado-escuro mb-0.5">
              Rei dos Combos - Gestao
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-verde-escuro truncate">Gerenciamento de Produtos</h1>
            <p className="text-xs sm:text-sm text-cinza-texto">Adicione ou edite lanches, porcoes, bebidas e precos.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push("/cardapio")}
            className="px-4 py-2 bg-white border border-cinza-borda hover:border-verde-normal text-verde-escuro rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            Ver Cardapio
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="px-4 py-2 bg-verde-normal hover:bg-verde-destaque text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Settings size={15} /> Configuracoes
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Barra de acoes */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-cinza-borda/60 shadow-sm">
          <div className="flex items-center gap-2">
            <Utensils size={19} className="text-verde-normal" />
            <h2 className="text-lg font-bold text-verde-escuro">Itens no cardapio</h2>
            <span className="text-xs font-bold bg-verde-claro text-verde-escuro px-2 py-0.5 rounded-full">
              {produtos.length}
            </span>
          </div>
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 bg-verde-normal hover:bg-verde-destaque text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer"
          >
            <Plus size={18} /> Novo Produto
          </button>
        </div>

        {/* Gerenciamento de Categorias */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-cinza-borda/60 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-verde-escuro">Categorias do cardapio</h3>
              <p className="text-[11px] text-cinza-texto">Clique no nome para renomear. Crie novas categorias.</p>
            </div>
            {!mostrarInputCategoria && (
              <button
                type="button"
                onClick={() => setMostrarInputCategoria(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-verde-normal text-white text-[11px] font-bold hover:bg-verde-destaque transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={13} /> Criar Categoria
              </button>
            )}
          </div>

          {/* Input para criar nova categoria */}
          {mostrarInputCategoria && (
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-verde-normal shrink-0" />
              <input
                type="text"
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                placeholder="Nome da nova categoria"
                className="flex-1 bg-fundo border border-cinza-borda rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-verde-normal"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); criarCategoria(); }
                  if (e.key === "Escape") { setMostrarInputCategoria(false); setNovaCategoriaNome(""); }
                }}
              />
              <button
                type="button"
                onClick={criarCategoria}
                disabled={criandoCategoria || !novaCategoriaNome.trim()}
                className="p-2 bg-verde-normal text-white rounded-xl hover:bg-verde-destaque transition-colors disabled:opacity-50 cursor-pointer"
                title="Salvar categoria"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => { setMostrarInputCategoria(false); setNovaCategoriaNome(""); }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-colors cursor-pointer"
                title="Cancelar"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Lista de categorias */}
          <div className="flex flex-wrap gap-2">
            {categoriasDisponiveis.map((categoriaDisponivel) => (
              <div key={categoriaDisponivel}>
                {categoriaEditando === categoriaDisponivel ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={categoriaEditValor}
                      onChange={(e) => setCategoriaEditValor(e.target.value)}
                      className="bg-fundo border border-verde-normal rounded-lg px-2.5 py-1 text-xs font-bold text-verde-escuro focus:outline-none focus:ring-2 focus:ring-verde-normal/20 w-28"
                      autoFocus
                      disabled={salvandoCategoria}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); salvarEdicaoCategoria(categoriaDisponivel); }
                        if (e.key === "Escape") { setCategoriaEditando(null); }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => salvarEdicaoCategoria(categoriaDisponivel)}
                      disabled={salvandoCategoria}
                      className="p-1 text-verde-normal hover:bg-verde-claro/40 rounded-md transition-colors cursor-pointer"
                      title="Salvar"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoriaEditando(null)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriaEditando(categoriaDisponivel);
                      setCategoriaEditValor(categoriaDisponivel);
                    }}
                    className="px-3 py-1.5 rounded-full border border-cinza-borda bg-fundo text-verde-escuro text-xs font-bold hover:border-dourado/60 hover:text-dourado-escuro transition-colors cursor-pointer"
                  >
                    <Edit3 size={12} className="inline mr-1" />
                    {categoriaDisponivel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grid de Produtos */}
        {carregando ? (
          <p className="text-cinza-texto text-sm py-10 text-center">Carregando cardapio...</p>
        ) : produtos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-cinza-borda/50 shadow-sm">
            <Utensils size={48} className="mx-auto text-cinza-texto mb-3 opacity-40" />
            <p className="text-cinza-texto text-sm">Nenhum produto cadastrado ainda.</p>
            <button
              onClick={abrirModalNovo}
              className="mt-4 bg-verde-normal text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-verde-destaque transition-colors cursor-pointer"
            >
              Cadastrar primeiro produto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {produtos.map((produto) => (
              <div
                key={produto.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden group transition-all hover:shadow-md ${
                  produto.status === "Inativo"
                    ? "border-red-200 opacity-70"
                    : "border-cinza-borda/50 hover:border-verde-normal/40"
                }`}
              >
                {/* Imagem */}
                <div className="relative w-full h-40 bg-gray-200 overflow-hidden">
                  {produto.imagem ? (
                    <img src={produto.imagem} alt={produto.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-gray-400" />
                    </div>
                  )}

                  {/* Badges sobre a imagem */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-verde-normal bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
                      {produto.categoria}
                    </span>
                    {produto.status === "Inativo" && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* Botoes de acao sobre a imagem */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => abrirModalEdicao(produto)}
                      className="p-1.5 bg-white/90 backdrop-blur-sm text-amber-600 hover:bg-amber-50 rounded-lg shadow-sm transition-colors cursor-pointer"
                      title="Editar produto"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => alternarStatusProduto(produto)}
                      className={`p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm transition-colors cursor-pointer ${
                        produto.status === "Inativo"
                          ? "text-verde-normal hover:bg-verde-claro/40"
                          : "text-cinza-texto hover:bg-fundo"
                      }`}
                      title={produto.status === "Inativo" ? "Ativar produto" : "Pausar produto"}
                    >
                      {produto.status === "Inativo" ? <Power size={15} /> : <PowerOff size={15} />}
                    </button>
                    <button
                      onClick={() => excluirProduto(produto.id)}
                      className="p-1.5 bg-white/90 backdrop-blur-sm text-red-500 hover:bg-red-50 rounded-lg shadow-sm transition-colors cursor-pointer"
                      title="Excluir produto"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Info do produto */}
                <div className="p-3.5">
                  <h3 className="font-bold text-verde-escuro text-sm truncate">{produto.nome}</h3>
                  <p className="text-xs text-cinza-texto line-clamp-2 mt-0.5 min-h-[2rem]">{produto.descricao}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-cinza-borda/30">
                    <span className="text-base font-extrabold text-verde-normal">
                      {precoFormatado(produto.preco)}
                    </span>
                    <button
                      onClick={() => abrirModalEdicao(produto)}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer transition-colors"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edicao / Criacao */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fecharModal} />

          <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            {/* Header do modal */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-cinza-borda/50 flex justify-between items-center rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-verde-escuro flex items-center gap-2">
                {produtoEditandoId ? (
                  <>
                    <Edit3 size={19} className="text-amber-500" /> Editar produto
                  </>
                ) : (
                  <>
                    <Plus size={19} className="text-verde-normal" /> Novo produto
                  </>
                )}
              </h2>
              <button
                onClick={fecharModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} className="text-cinza-texto" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={salvarProduto} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-cinza-texto mb-1.5">Nome do produto</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Burger Artesanal"
                  className="w-full bg-fundo border border-cinza-borda rounded-xl p-3 text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-cinza-texto mb-1.5">Categoria</label>
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  list="categorias-modal"
                  placeholder="Digite ou escolha uma categoria"
                  className="w-full bg-fundo border border-cinza-borda rounded-xl p-3 text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 transition-all"
                />
                <datalist id="categorias-modal">
                  {categoriasDisponiveis.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-cinza-texto mb-1.5">Preco (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="Ex: 29.90"
                  className="w-full bg-fundo border border-cinza-borda rounded-xl p-3 text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-cinza-texto mb-1.5">Disponibilidade</label>
                <div className="flex rounded-xl border border-cinza-borda overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setStatus("Ativo")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                      status === "Ativo" ? "bg-verde-normal text-white" : "bg-white text-verde-escuro hover:bg-verde-claro/40"
                    }`}
                  >
                    <Power size={14} /> Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("Inativo")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                      status === "Inativo" ? "bg-red-500 text-white" : "bg-white text-verde-escuro hover:bg-red-50"
                    }`}
                  >
                    <PowerOff size={14} /> Inativo
                  </button>
                </div>
                <p className="text-[11px] text-cinza-texto mt-1">Itens inativos ficam ocultos para o cliente.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-cinza-texto mb-1.5">Imagem do produto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImagem}
                  disabled={fazendoUpload}
                  className="w-full bg-fundo border border-cinza-borda rounded-xl p-2.5 text-sm focus:outline-none focus:border-verde-normal file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-verde-claro file:text-verde-escuro hover:file:bg-verde-normal/20 file:cursor-pointer"
                />
                {fazendoUpload && (
                  <p className="text-xs text-amber-500 mt-2 font-semibold animate-pulse">Enviando imagem...</p>
                )}
                {imagem && !fazendoUpload && (
                  <div className="mt-3 relative w-20 h-20 rounded-xl overflow-hidden border border-dourado/40 shadow-sm">
                    <img src={imagem} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-cinza-texto mb-1.5">Descricao</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ingredientes e detalhes..."
                  rows={3}
                  className="w-full bg-fundo border border-cinza-borda rounded-xl p-3 text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={salvando || fazendoUpload}
                className={`w-full text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-50 cursor-pointer ${
                  produtoEditandoId ? "bg-amber-500 hover:bg-amber-600" : "bg-verde-normal hover:bg-verde-destaque"
                }`}
              >
                {salvando ? "Salvando..." : produtoEditandoId ? "Salvar alteracoes" : "Cadastrar produto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
