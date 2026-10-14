"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  createGroup,
  getMyGroupInvites,
  getMyGroups,
  respondGroupInvite,
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
  type GroupSummary,
  type ReceivedGroupInvite,
} from "../lib/groups";

export default function GruposPage() {
  const router = useRouter();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [invites, setInvites] = useState<ReceivedGroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const [loadedGroups, loadedInvites] = await Promise.all([
        getMyGroups(),
        getMyGroupInvites(),
      ]);

      setGroups(loadedGroups);
      setInvites(loadedInvites);
    } catch (err) {
      console.error("Erro ao carregar grupos:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar seus grupos.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleInviteResponse(
    invite: ReceivedGroupInvite,
    accept: boolean,
  ) {
    setBusyInviteId(invite.id);
    setError("");

    try {
      await respondGroupInvite(invite.id, accept);
      await load(true);
    } catch (err) {
      console.error("Erro ao responder convite:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível responder ao convite.",
      );
    } finally {
      setBusyInviteId(null);
    }
  }

  function openCreate() {
    setName("");
    setDescription("");
    setCreateError("");
    setCreateOpen(true);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setCreateError("O nome do grupo deve ter entre 2 e 60 caracteres.");
      return;
    }

    if (description.trim().length > 300) {
      setCreateError("A descrição deve ter no máximo 300 caracteres.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const id = await createGroup(trimmedName, description);

      router.push(`/grupos/${id}`);
    } catch (err) {
      console.error("Erro ao criar grupo:", err);

      setCreateError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar o grupo. Tente novamente.",
      );
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">Colaboração</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Grupos
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Organize compromissos e tarefas junto com outras pessoas.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="shrink-0 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white"
          >
            + Criar grupo
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {invites.length > 0 && (
          <section className="mt-8 rounded-3xl border border-sky-400/30 bg-sky-400/5 p-5">
            <h2 className="text-lg font-medium">
              {invites.length === 1
                ? "Você recebeu 1 convite"
                : `Você recebeu ${invites.length} convites`}
            </h2>

            <div className="mt-4 space-y-3">
              {invites.map((invite) => (
                <article
                  key={invite.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <p className="break-words font-medium">{invite.groupName}</p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Convite de {invite.invitedByName}
                  </p>

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      disabled={busyInviteId !== null}
                      onClick={() => void handleInviteResponse(invite, true)}
                      className="flex-1 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:opacity-50"
                    >
                      {busyInviteId === invite.id ? "Salvando..." : "Aceitar"}
                    </button>

                    <button
                      type="button"
                      disabled={busyInviteId !== null}
                      onClick={() => void handleInviteResponse(invite, false)}
                      className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Recusar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-medium">Meus grupos</h2>

          {loading ? (
            <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-400">
              Carregando grupos...
            </div>
          ) : groups.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
              <p className="text-zinc-300">
                Você ainda não participa de grupos.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Crie um grupo ou aceite um convite para começar.
              </p>

              <button
                type="button"
                onClick={openCreate}
                className="mt-5 rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950"
              >
                Criar grupo
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/grupos/${group.id}`}
                  className="flex items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-lg font-semibold">
                    {group.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{group.name}</h3>

                    {group.description && (
                      <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                        {group.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-3 py-1 ${ROLE_BADGE_CLASSES[group.myRole]}`}
                      >
                        {ROLE_LABELS[group.myRole]}
                      </span>

                      <span className="text-zinc-500">
                        {group.memberCount}{" "}
                        {group.memberCount === 1 ? "membro" : "membros"}
                      </span>
                    </div>
                  </div>

                  <span className="text-xl text-zinc-600">›</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) {
              setCreateOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-criar-grupo"
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-7"
          >
            <h2 id="titulo-criar-grupo" className="text-xl font-semibold">
              Criar grupo
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Você será o dono e poderá convidar pessoas em seguida.
            </p>

            <form onSubmit={handleCreate} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="nome-grupo"
                  className="mb-2 block text-sm font-medium"
                >
                  Nome do grupo
                </label>

                <input
                  id="nome-grupo"
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-sky-500"
                  placeholder="Ex.: Equipe de robótica"
                />
              </div>

              <div>
                <label
                  htmlFor="descricao-grupo"
                  className="mb-2 block text-sm font-medium"
                >
                  Descrição
                  <span className="ml-2 text-xs font-normal text-zinc-600">
                    opcional
                  </span>
                </label>

                <textarea
                  id="descricao-grupo"
                  rows={3}
                  maxLength={300}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition placeholder:text-zinc-600 focus:border-sky-500"
                  placeholder="Para que serve este grupo?"
                />
              </div>

              {createError && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
                >
                  {createError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? "Criando..." : "Criar grupo"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
