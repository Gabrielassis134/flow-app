"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviarFormulario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem("");
    setCarregando(true);

    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
        });

        if (error) throw error;

        setMensagem(
          data.session
            ? "Conta criada! Você já pode entrar no Flow."
            : "Conta criada! Confira seu e-mail para confirmar o cadastro.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (error) throw error;

        window.location.href = "/";
      }
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-7 shadow-xl sm:p-9">
        <a href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Voltar ao Flow
        </a>

        <div className="mb-8 mt-8">
          <p className="text-sm font-medium text-sky-400">
            Organize sua rotina. Viva seu tempo.
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {modo === "entrar" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {modo === "entrar"
              ? "Entre para continuar sua organização."
              : "Comece a organizar sua rotina com o Flow."}
          </p>
        </div>

        <form onSubmit={enviarFormulario} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-500"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-2 block text-sm">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete={
                modo === "entrar" ? "current-password" : "new-password"
              }
              minLength={6}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-500"
              placeholder="Pelo menos 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {carregando
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        {mensagem && (
          <p
            role="status"
            className="mt-5 break-words rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300"
          >
            {mensagem}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          {modo === "entrar" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setModo(modo === "entrar" ? "criar" : "entrar");
              setMensagem("");
            }}
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            {modo === "entrar" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </section>
    </main>
  );
}
