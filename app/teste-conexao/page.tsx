"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function TesteConexaoPage() {
  const [mensagem, setMensagem] = useState("Ainda não testado.");
  const [carregando, setCarregando] = useState(false);

  async function testarConexao() {
    setCarregando(true);
    setMensagem("Verificando conexão e sessão...");

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setMensagem(`Erro ao consultar a sessão: ${error.message}`);
        return;
      }

      if (data.session?.user) {
        setMensagem(
          `Conexão funcionando! Usuário autenticado: ${data.session.user.email ?? data.session.user.id}`,
        );
      } else {
        setMensagem(
          "Conexão funcionando, mas nenhum usuário está conectado nesta sessão do navegador. Acesse /login para entrar.",
        );
      }
    } catch {
      setMensagem(
        "Não foi possível consultar o Supabase. Confira a internet e as variáveis do .env.local.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-3 text-2xl font-semibold">Teste de conexão</h1>

      <p className="mb-5 text-sm text-gray-500">
        Vamos verificar a conexão com o Supabase e se existe uma sessão
        autenticada no Flow.
      </p>

      <button
        onClick={testarConexao}
        disabled={carregando}
        className="rounded-xl bg-sky-600 px-5 py-3 text-white disabled:opacity-50"
      >
        {carregando ? "Testando..." : "Testar conexão"}
      </button>

      <p role="status" aria-live="polite" className="mt-5 break-words">
        {mensagem}
      </p>
    </main>
  );
}
