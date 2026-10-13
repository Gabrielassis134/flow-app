"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type Aviso = { tipo: "erro" | "sucesso"; texto: string } | null;

const MENSAGEM_USUARIO_INVALIDO =
  "Nome de usuário inválido. Use de 8 a 30 caracteres, somente letras minúsculas, números, pontos e sublinhados. Não use ponto no início, no fim ou dois pontos seguidos.";

function validarNomeUsuario(usuario: string) {
  return (
    usuario.length >= 8 &&
    usuario.length <= 30 &&
    /^[a-z0-9._]+$/.test(usuario) &&
    !usuario.startsWith(".") &&
    !usuario.endsWith(".") &&
    !usuario.includes("..")
  );
}

function traduzirErro(mensagem: string) {
  const texto = mensagem.toLowerCase();

  if (texto.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }

  if (texto.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }

  if (texto.includes("already registered")) {
    return "Este e-mail já está cadastrado. Tente entrar.";
  }

  if (texto.includes("rate limit") || texto.includes("too many")) {
    return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  }

  if (texto.includes("password should be")) {
    return "A senha é muito fraca. Use pelo menos 8 caracteres.";
  }

  if (texto.includes("database error saving new user")) {
    return "Não foi possível criar a conta. Esse nome de usuário pode já estar em uso.";
  }

  if (texto.includes("failed to fetch") || texto.includes("network")) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

export default function LoginPage() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviarFormulario(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAviso(null);

    const usuario = nomeUsuario.trim().toLowerCase();

    if (modo === "criar") {
      if (!nome.trim()) {
        setAviso({ tipo: "erro", texto: "Digite seu nome de exibição." });
        return;
      }

      if (!validarNomeUsuario(usuario)) {
        setAviso({ tipo: "erro", texto: MENSAGEM_USUARIO_INVALIDO });
        return;
      }

      if (senha.length < 8) {
        setAviso({
          tipo: "erro",
          texto: "A senha deve ter pelo menos 8 caracteres.",
        });
        return;
      }
    }

    setCarregando(true);

    // Quando o login dá certo, o LayoutShell percebe a nova sessão e
    // redireciona para o início. Aqui só mantemos o botão bloqueado.
    let sessaoIniciada = false;

    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: nome.trim(),
              username: usuario,
            },
          },
        });

        if (error) throw error;

        // Com confirmação de e-mail ativa, um e-mail já cadastrado não gera
        // erro: o Supabase devolve um usuário sem identidades.
        if (data.user && data.user.identities?.length === 0) {
          setAviso({
            tipo: "erro",
            texto: "Este e-mail já está cadastrado. Tente entrar.",
          });
          return;
        }

        if (data.session) {
          sessaoIniciada = true;
          return;
        }

        setAviso({
          tipo: "sucesso",
          texto: "Conta criada! Confira seu e-mail para confirmar o cadastro.",
        });
        setSenha("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) throw error;

        sessaoIniciada = true;
      }
    } catch (erro) {
      console.error("Erro de autenticação:", erro);

      setAviso({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? traduzirErro(erro.message)
            : "Não foi possível concluir a operação. Tente novamente.",
      });
    } finally {
      if (!sessaoIniciada) setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-7 shadow-xl sm:p-9">
        <div className="mb-8">
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
          {modo === "criar" && (
            <>
              <div>
                <label htmlFor="nome" className="mb-2 block text-sm">
                  Nome de exibição
                </label>

                <input
                  id="nome"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Gabriel Assis"
                />

                <p className="mt-1 text-xs text-zinc-500">
                  Como seu nome aparecerá para outras pessoas.
                </p>
              </div>

              <div>
                <label htmlFor="nomeUsuario" className="mb-2 block text-sm">
                  Nome de usuário
                </label>

                <div className="flex items-center rounded-xl border border-zinc-700 bg-zinc-950 focus-within:border-sky-500">
                  <span className="pl-4 text-zinc-500">@</span>

                  <input
                    id="nomeUsuario"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={8}
                    maxLength={30}
                    value={nomeUsuario}
                    onChange={(e) => {
                      const valor = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9._]/g, "")
                        .slice(0, 30);

                      setNomeUsuario(valor);
                    }}
                    aria-describedby="dica-usuario"
                    className="w-full rounded-xl bg-transparent px-2 py-3 outline-none"
                    placeholder="gabriel.assis"
                  />
                </div>

                <p id="dica-usuario" className="mt-1 text-xs text-zinc-500">
                  8 a 30 caracteres: letras minúsculas, números, ponto e
                  sublinhado. Sem espaços ou pontos consecutivos.
                </p>

                {nomeUsuario.length > 0 && (
                  <p
                    className={`mt-2 text-xs ${
                      validarNomeUsuario(nomeUsuario)
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {validarNomeUsuario(nomeUsuario)
                      ? `Seu usuário será @${nomeUsuario}`
                      : "Confira as regras do nome de usuário."}
                  </p>
                )}
              </div>
            </>
          )}

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
              minLength={modo === "criar" ? 8 : undefined}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-500"
              placeholder={
                modo === "criar" ? "Pelo menos 8 caracteres" : "Sua senha"
              }
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

        {aviso && (
          <p
            role={aviso.tipo === "erro" ? "alert" : "status"}
            className={`mt-5 break-words rounded-xl border p-3 text-sm ${
              aviso.tipo === "erro"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {aviso.texto}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          {modo === "entrar" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setModo(modo === "entrar" ? "criar" : "entrar");
              setAviso(null);
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
