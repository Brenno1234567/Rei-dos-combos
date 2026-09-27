"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Lock, Eye, EyeOff } from "lucide-react";
import { signInWithGoogle } from "../../lib/firebase-client";

function LoginForm() {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao fazer login.");
        return;
      }

      localStorage.setItem("erva_doce_user", JSON.stringify({ nome: data.nome, cargo: data.cargo }));

      const redirect = searchParams.get("redirect");
      if (redirect && redirect.startsWith("/")) {
        router.push(redirect);
        return;
      }

      if (data.cargo === "cozinha") {
        router.push("/painel-pedidos");
      } else if (data.cargo === "admin") {
        router.push("/admin");
      } else if (data.cargo === "atendente") {
        router.push("/atendimento");
      } else {
        router.push("/cardapio");
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
      setErro("Erro de conexão com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErro("");
    setCarregando(true);

    try {
      const idToken = await signInWithGoogle();
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Esta conta Google não tem acesso.");
        return;
      }

      localStorage.setItem("erva_doce_user", JSON.stringify({ nome: data.nome, cargo: data.cargo }));
      const redirect = searchParams.get("redirect");
      router.push(redirect?.startsWith("/") ? redirect : "/painel-pedidos");
    } catch (err) {
      console.error("Erro no login Google:", err);
      setErro(err instanceof Error ? err.message : "Não foi possível entrar com Google.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-fundo flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-cinza-borda shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-verde-normal/10 text-verde-normal rounded-2xl mb-3">
            <LogIn size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-verde-escuro">Acesso ao Sistema</h1>
          <p className="text-xs text-cinza-texto">Digite sua senha de acesso</p>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4 font-medium text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-verde-escuro mb-1">Senha de Acesso</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-cinza-texto" />
              <input
                type={mostrarSenha ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-cinza-borda text-sm focus:outline-none focus:border-verde-normal text-verde-escuro font-medium text-center"
                required
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-2.5 p-0.5 text-cinza-texto hover:text-verde-escuro transition-colors cursor-pointer"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[11px] text-cinza-texto mt-1.5">
              Aceita letras, números e caracteres especiais.
            </p>
          </div>

          <button
            type="submit"
            disabled={carregando || pin.length < 4}
            className="w-full bg-verde-normal hover:bg-verde-destaque text-white font-bold py-3 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {carregando ? "Entrando..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5 text-xs text-cinza-texto">
          <div className="h-px flex-1 bg-cinza-borda" />
          ou
          <div className="h-px flex-1 bg-cinza-borda" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={carregando}
          className="w-full border border-cinza-borda hover:bg-gray-50 text-verde-escuro font-bold py-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          Entrar com Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-fundo flex items-center justify-center text-verde-escuro">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
