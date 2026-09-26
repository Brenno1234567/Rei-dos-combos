"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserPlus, Shield, Trash2, ArrowLeft, Pencil, X, Eye, EyeOff } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  cargo: string;
  pin: string;
}

const CARGO_LABELS: Record<string, string> = {
  admin: "Administrador",
  cozinha: "Cozinha",
  atendente: "Atendente",
};

function labelDoCargo(cargo: string) {
  return CARGO_LABELS[cargo.toLowerCase()] ?? cargo;
}

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novoNome, setNovoNome] = useState("");
  const [novoCargo, setNovoCargo] = useState<"Administrador" | "Cozinha" | "Atendente">("Atendente");
  const [novoPin, setNovoPin] = useState("");
  const [mostrarNovoPin, setMostrarNovoPin] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const jaExisteAdmin = usuarios.some((usuario) => usuario.cargo.toLowerCase() === "admin");

  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCargo, setEditCargo] = useState<"Administrador" | "Cozinha" | "Atendente">("Atendente");
  const [editPin, setEditPin] = useState("");
  const [mostrarEditPin, setMostrarEditPin] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const carregarUsuarios = async () => {
    try {
      const res = await fetch("/api/usuarios");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsuarios(data);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const adicionarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoPin) return;

    setSalvando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, cargo: novoCargo, pin: novoPin }),
      });

      if (res.ok) {
        setNovoNome("");
        setNovoPin("");
        carregarUsuarios();
        alert("Colaborador cadastrado com sucesso!");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Erro ao cadastrar colaborador.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  };

  const abrirEdicao = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setEditNome(usuario.nome);
    setEditCargo((CARGO_LABELS[usuario.cargo.toLowerCase()] ?? usuario.cargo) as "Administrador" | "Cozinha" | "Atendente");
    setEditPin("");
    setMostrarEditPin(false);
  };

  const fecharEdicao = () => {
    setUsuarioEditando(null);
    setEditNome("");
    setEditPin("");
    setMostrarEditPin(false);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando || !editNome) return;

    setSalvandoEdicao(true);
    try {
      const payload: Record<string, string> = { nome: editNome, cargo: editCargo };
      if (editPin) payload.pin = editPin;

      const res = await fetch(`/api/usuarios/${usuarioEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fecharEdicao();
        carregarUsuarios();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Erro ao salvar alterações.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const removerUsuario = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este acesso?")) return;

    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
      if (res.ok) {
        carregarUsuarios();
      } else {
        alert("Erro ao remover usuário.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    }
  };

  return (
    <div className="min-h-screen bg-fundo flex flex-col">
      <header className="bg-verde-escuro text-white p-4 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/painel-pedidos" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-base sm:text-xl font-bold flex items-center gap-2 min-w-0">
            <Users size={20} className="shrink-0" />
            <span className="truncate">Gerenciamento de Equipe e Senhas</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6 sm:space-y-8">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-cinza-borda shadow-sm">
          <h2 className="font-bold text-verde-escuro text-lg mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-verde-normal" /> Adicionar Novo Colaborador
          </h2>

          <form onSubmit={adicionarUsuario} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-verde-escuro mb-1">Nome / Apelido</label>
              <input
                type="text"
                placeholder="Ex: João atendente"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-verde-escuro mb-1">Cargo / Permissão</label>
              <select
                value={novoCargo}
                onChange={(e) => setNovoCargo(e.target.value as "Administrador" | "Cozinha" | "Atendente")}
                className="w-full px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal bg-white"
              >
                <option value="Administrador" disabled={jaExisteAdmin}>Administrador{jaExisteAdmin ? " (já cadastrado)" : ""}</option>
                <option value="Cozinha">Cozinha</option>
                <option value="Atendente">Atendente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-verde-escuro mb-1">Senha de Acesso</label>
              <div className="relative">
                <input
                  type={mostrarNovoPin ? "text" : "password"}
                  placeholder="Mínimo 4 caracteres"
                  value={novoPin}
                  onChange={(e) => setNovoPin(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarNovoPin(!mostrarNovoPin)}
                  className="absolute right-3 top-2.5 p-0.5 text-cinza-texto hover:text-verde-escuro transition-colors cursor-pointer"
                  aria-label={mostrarNovoPin ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {mostrarNovoPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-cinza-texto mt-0.5">Aceita letras, números e caracteres especiais.</p>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="bg-verde-normal hover:bg-verde-destaque text-white font-bold py-2.5 px-4 rounded-xl shadow transition-all text-sm disabled:opacity-50 cursor-pointer"
            >
              {salvando ? "Salvando..." : "Cadastrar"}
            </button>
          </form>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-cinza-borda shadow-sm">
          <h2 className="font-bold text-verde-escuro text-lg mb-4 flex items-center gap-2">
            <Shield size={18} className="text-verde-normal" /> Colaboradores Ativos
          </h2>

          {carregando ? (
            <p className="text-center py-6 text-sm text-cinza-texto">Carregando equipe...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-center py-6 text-sm text-cinza-texto">Nenhum colaborador cadastrado.</p>
          ) : (
            <>
              {/* Cards — mobile */}
              <div className="md:hidden space-y-3">
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="p-4 rounded-xl border border-cinza-borda/40 bg-fundo/30 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-verde-escuro truncate">{usuario.nome}</p>
                      <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        usuario.cargo.toLowerCase() === "admin" ? "bg-purple-100 text-purple-700" :
                        usuario.cargo.toLowerCase() === "cozinha" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {labelDoCargo(usuario.cargo)}
                      </span>
                      <p className="text-xs text-cinza-texto mt-2 font-mono tracking-widest">Senha: ••••</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => abrirEdicao(usuario)}
                        className="p-2.5 text-verde-normal hover:bg-verde-normal/10 rounded-lg transition-colors cursor-pointer"
                        title="Editar colaborador"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => removerUsuario(usuario.id)}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover acesso"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela — desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-cinza-borda/60 text-xs text-cinza-texto uppercase tracking-wider">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4">Senha Configurada</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cinza-borda/30 text-sm">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-fundo/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-verde-escuro">{usuario.nome}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          usuario.cargo.toLowerCase() === "admin" ? "bg-purple-100 text-purple-700" :
                          usuario.cargo.toLowerCase() === "cozinha" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {labelDoCargo(usuario.cargo)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono tracking-widest text-cinza-texto">••••</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => abrirEdicao(usuario)}
                            className="p-2 text-verde-normal hover:bg-verde-normal/10 rounded-lg transition-colors cursor-pointer"
                            title="Editar colaborador"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => removerUsuario(usuario.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover acesso"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </main>

      {usuarioEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-verde-escuro text-lg flex items-center gap-2">
                <Pencil size={18} className="text-verde-normal" /> Editar Colaborador
              </h2>
              <button
                onClick={fecharEdicao}
                className="p-1.5 text-cinza-texto hover:bg-fundo rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={salvarEdicao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-verde-escuro mb-1">Nome / Apelido</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-verde-escuro mb-1">Cargo / Permissão</label>
                <select
                  value={editCargo}
                  onChange={(e) => setEditCargo(e.target.value as "Administrador" | "Cozinha" | "Atendente")}
                  className="w-full px-4 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal bg-white"
                >
                  <option
                    value="Administrador"
                    disabled={jaExisteAdmin && usuarioEditando.cargo.toLowerCase() !== "admin"}
                  >
                    Administrador
                    {jaExisteAdmin && usuarioEditando.cargo.toLowerCase() !== "admin" ? " (já cadastrado)" : ""}
                  </option>
                  <option value="Cozinha">Cozinha</option>
                  <option value="Atendente">Atendente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-verde-escuro mb-1">
                  Nova Senha <span className="font-normal text-cinza-texto">(deixe em branco para manter a atual)</span>
                </label>
                <div className="relative">
                  <input
                    type={mostrarEditPin ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal focus:ring-2 focus:ring-verde-normal/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarEditPin(!mostrarEditPin)}
                    className="absolute right-3 top-2.5 p-0.5 text-cinza-texto hover:text-verde-escuro transition-colors cursor-pointer"
                    aria-label={mostrarEditPin ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {mostrarEditPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={fecharEdicao}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-cinza-borda text-sm font-bold text-cinza-texto hover:bg-fundo transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="flex-1 bg-verde-normal hover:bg-verde-destaque text-white font-bold py-2.5 px-4 rounded-xl shadow transition-all text-sm disabled:opacity-50 cursor-pointer"
                >
                  {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
