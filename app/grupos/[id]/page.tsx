"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  cancelGroupInvite,
  deleteGroup,
  getGroupDetails,
  getGroupPendingInvites,
  inviteToGroup,
  removeMember,
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
  searchUsersForGroup,
  setMemberCanInvite,
  setMemberRole,
  updateGroup,
  type GroupDetails,
  type GroupMember,
  type SentGroupInvite,
  type UserSuggestion,
} from "../../lib/groups";

type Feedback = { tipo: "erro" | "sucesso"; texto: string } | null;

export default function GrupoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params.id;

  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [pendingInvites, setPendingInvites] = useState<SentGroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [inviteUsername, setInviteUsername] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"leave" | "delete" | null>(
    null,
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");

      try {
        const loaded = await getGroupDetails(groupId);

        setDetails(loaded);

        if (loaded && (loaded.me.role === "owner" || loaded.me.canInvite)) {
          try {
            setPendingInvites(await getGroupPendingInvites(groupId));
          } catch (inviteError) {
            // A lista de convites é secundária: não derruba a página.
            console.error("Erro ao carregar convites pendentes:", inviteError);
            setPendingInvites([]);
          }
        } else {
          setPendingInvites([]);
        }
      } catch (err) {
        console.error("Erro ao carregar o grupo:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o grupo.",
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [groupId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Sugestões de pessoas enquanto se digita (com pequena espera).
  useEffect(() => {
    const term = inviteUsername.trim().replace(/^@/, "");

    if (term.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    let active = true;

    setSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchUsersForGroup(groupId, term);

        if (!active) return;

        setSuggestions(results);
        setActiveSuggestion(-1);
      } catch (err) {
        console.error("Erro ao buscar pessoas:", err);

        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [inviteUsername, groupId]);

  async function run(
    key: string,
    action: () => Promise<void>,
    successMessage?: string,
  ) {
    setBusy(key);
    setFeedback(null);

    try {
      await action();

      if (successMessage) {
        setFeedback({ tipo: "sucesso", texto: successMessage });
      }

      await load(true);
    } catch (err) {
      console.error("Erro na ação do grupo:", err);

      setFeedback({
        tipo: "erro",
        texto:
          err instanceof Error
            ? err.message
            : "Não foi possível concluir a ação.",
      });
    } finally {
      setBusy(null);
    }
  }

  function selectSuggestion(suggestion: UserSuggestion) {
    setInviteUsername(suggestion.username);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  }

  function handleInviteKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      return;
    }

    if (!suggestionsOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const username = inviteUsername.trim().replace(/^@/, "").toLowerCase();

    if (!/^[a-z0-9._]{8,30}$/.test(username)) {
      setFeedback({
        tipo: "erro",
        texto: "Escolha uma pessoa da lista ou digite o @usuário completo.",
      });
      return;
    }

    setSuggestionsOpen(false);

    await run(
      "invite",
      async () => {
        await inviteToGroup(groupId, username);
        setInviteUsername("");
      },
      `Convite enviado para @${username}.`,
    );
  }

  async function handleLeaveOrDelete() {
    if (!details || !confirmAction) return;

    setBusy(confirmAction);
    setFeedback(null);

    try {
      if (confirmAction === "delete") {
        await deleteGroup(groupId);
      } else {
        await removeMember(groupId, details.me.userId);
      }

      router.push("/grupos");
    } catch (err) {
      console.error("Erro ao sair/excluir o grupo:", err);

      setFeedback({
        tipo: "erro",
        texto:
          err instanceof Error
            ? err.message
            : "Não foi possível concluir a ação.",
      });
      setConfirmAction(null);
      setBusy(null);
    }
  }

  function openEdit() {
    if (!details) return;

    setEditName(details.group.name);
    setEditDescription(details.group.description);
    setEditError("");
    setEditOpen(true);
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = editName.trim();

    if (name.length < 2 || name.length > 60) {
      setEditError("O nome do grupo deve ter entre 2 e 60 caracteres.");
      return;
    }

    if (editDescription.trim().length > 300) {
      setEditError("A descrição deve ter no máximo 300 caracteres.");
      return;
    }

    setBusy("edit");
    setEditError("");

    try {
      await updateGroup(groupId, { name, description: editDescription });
      setEditOpen(false);
      await load(true);
    } catch (err) {
      console.error("Erro ao editar o grupo:", err);

      setEditError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as alterações.",
      );
    } finally {
      setBusy(null);
    }
  }

  function memberLabel(member: GroupMember) {
    return member.displayName || member.username || "Participante";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-400">
          Carregando grupo...
        </div>
      </main>
    );
  }

  if (error || !details) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/grupos"
            className="text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            ← Grupos
          </Link>

          <div
            role="alert"
            className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center"
          >
            <p className="text-zinc-300">
              {error || "Grupo não encontrado ou você não participa dele."}
            </p>

            {error && (
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const { group, members, me } = details;
  const isOwner = me.role === "owner";
  const canInviteNow = isOwner || me.canInvite;
  const actionBusy = busy !== null;
  const showSuggestions =
    suggestionsOpen && inviteUsername.trim().replace(/^@/, "").length >= 3;

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/grupos"
          className="text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          ← Grupos
        </Link>

        <header className="mt-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-zinc-500">Grupo</p>

            <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">
              {group.name}
            </h1>

            {group.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-400">
                {group.description}
              </p>
            )}

            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-xs ${ROLE_BADGE_CLASSES[me.role]}`}
            >
              Você é {ROLE_LABELS[me.role].toLowerCase()}
            </span>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={openEdit}
              className="shrink-0 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Editar
            </button>
          )}
        </header>

        {(isOwner || me.role === "admin") && (
          <Link
            href={`/criar/grupo?grupo=${group.id}`}
            className="mt-6 flex items-center justify-between gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <div>
              <p className="font-medium">Novo compromisso ou tarefa</p>

              <p className="mt-1 text-sm text-zinc-500">
                Escolha quem participa e envie o pedido.
              </p>
            </div>

            <span className="text-xl text-zinc-600">›</span>
          </Link>
        )}

        {feedback && (
          <p
            role={feedback.tipo === "erro" ? "alert" : "status"}
            className={`mt-6 break-words rounded-2xl border p-4 text-sm ${
              feedback.tipo === "erro"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {feedback.texto}
          </p>
        )}

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Membros</h2>

            <span className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-400">
              {members.length}
            </span>
          </div>

          {isOwner && (
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Administradores podem criar compromissos e tarefas para o grupo.
              &quot;Pode convidar&quot; permite adicionar novos membros.
            </p>
          )}

          <ul className="mt-5 space-y-3">
            {members.map((member) => {
              const isMe = member.userId === me.userId;
              const canManage = isOwner && member.role !== "owner";

              return (
                <li
                  key={member.userId}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-semibold">
                      {memberLabel(member).charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {memberLabel(member)}
                        {isMe && (
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            (você)
                          </span>
                        )}
                      </p>

                      {member.username && (
                        <p className="truncate text-sm text-zinc-500">
                          @{member.username}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${ROLE_BADGE_CLASSES[member.role]}`}
                      >
                        {ROLE_LABELS[member.role]}
                      </span>

                      {!canManage &&
                        member.role !== "owner" &&
                        member.canInvite && (
                          <span className="text-xs text-zinc-500">
                            Pode convidar
                          </span>
                        )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
                      <SwitchRow
                        label="Administrador"
                        enabled={member.role === "admin"}
                        disabled={actionBusy}
                        onClick={() =>
                          void run(`role-${member.userId}`, () =>
                            setMemberRole(
                              groupId,
                              member.userId,
                              member.role === "admin" ? "member" : "admin",
                            ),
                          )
                        }
                      />

                      <SwitchRow
                        label="Pode convidar"
                        enabled={member.canInvite}
                        disabled={actionBusy}
                        onClick={() =>
                          void run(`invite-${member.userId}`, () =>
                            setMemberCanInvite(
                              groupId,
                              member.userId,
                              !member.canInvite,
                            ),
                          )
                        }
                      />

                      {removingId === member.userId ? (
                        <div className="flex items-center gap-2 pt-1">
                          <p className="flex-1 text-sm text-rose-300">
                            Remover {memberLabel(member)} do grupo?
                          </p>

                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => setRemovingId(null)}
                            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => {
                              setRemovingId(null);
                              void run(
                                `remove-${member.userId}`,
                                () => removeMember(groupId, member.userId),
                                `${memberLabel(member)} foi removido(a) do grupo.`,
                              );
                            }}
                            className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-rose-400 disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => setRemovingId(member.userId)}
                          className="text-sm text-rose-300 transition hover:text-rose-200 disabled:opacity-50"
                        >
                          Remover do grupo
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {canInviteNow && (
          <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
            <h2 className="text-lg font-medium">Convidar pessoas</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Busque por nome ou @usuário. A pessoa recebe o convite e entra no
              grupo quando aceitar.
            </p>

            <form onSubmit={handleInvite} className="mt-4 flex gap-2">
              <div
                className="relative min-w-0 flex-1"
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    setSuggestionsOpen(false);
                  }
                }}
              >
                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-sky-500">
                  <input
                    type="text"
                    role="combobox"
                    aria-expanded={showSuggestions}
                    aria-controls="sugestoes-usuarios"
                    aria-autocomplete="list"
                    aria-activedescendant={
                      activeSuggestion >= 0
                        ? `sugestao-${activeSuggestion}`
                        : undefined
                    }
                    aria-label="Buscar pessoa por nome ou @usuário"
                    value={inviteUsername}
                    maxLength={60}
                    spellCheck={false}
                    autoComplete="off"
                    onFocus={() => setSuggestionsOpen(true)}
                    onChange={(event) => {
                      setInviteUsername(event.target.value);
                      setSuggestionsOpen(true);
                    }}
                    onKeyDown={handleInviteKeyDown}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"
                    placeholder="Buscar por nome ou @usuário"
                  />
                </div>

                {showSuggestions && (
                  <ul
                    id="sugestoes-usuarios"
                    role="listbox"
                    className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl"
                  >
                    {suggestions.length === 0 ? (
                      <li className="px-3 py-3 text-sm text-zinc-500">
                        {searching
                          ? "Buscando..."
                          : "Nenhuma pessoa encontrada."}
                      </li>
                    ) : (
                      suggestions.map((suggestion, index) => (
                        <li
                          key={suggestion.id}
                          id={`sugestao-${index}`}
                          role="option"
                          aria-selected={index === activeSuggestion}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectSuggestion(suggestion)}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${
                            index === activeSuggestion
                              ? "bg-zinc-800"
                              : "hover:bg-zinc-800/70"
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-semibold">
                            {(suggestion.displayName || suggestion.username)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {suggestion.displayName ||
                                `@${suggestion.username}`}
                            </p>

                            <p className="truncate text-xs text-zinc-500">
                              @{suggestion.username}
                            </p>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={actionBusy || !inviteUsername.trim()}
                className="shrink-0 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "invite" ? "Enviando..." : "Convidar"}
              </button>
            </form>

            {pendingInvites.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-zinc-400">Convites pendentes</p>

                <ul className="mt-3 space-y-2">
                  {pendingInvites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {invite.displayName || `@${invite.username}`}
                        </p>

                        <p className="truncate text-xs text-zinc-500">
                          @{invite.username} · convidado por{" "}
                          {invite.invitedByName}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          void run(
                            `cancel-${invite.id}`,
                            () => cancelGroupInvite(invite.id),
                            "Convite cancelado.",
                          )
                        }
                        className="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
          {confirmAction === null ? (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => setConfirmAction(isOwner ? "delete" : "leave")}
              className="w-full rounded-2xl border border-rose-500/30 px-4 py-3 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
            >
              {isOwner ? "Excluir grupo" : "Sair do grupo"}
            </button>
          ) : (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-sm font-medium text-rose-200">
                {confirmAction === "delete"
                  ? "Excluir este grupo para todos?"
                  : "Deseja sair deste grupo?"}
              </p>

              <p className="mt-1 text-xs text-rose-300/80">
                {confirmAction === "delete"
                  ? "Os membros, convites e itens do grupo serão apagados. Compromissos e tarefas já aceitos nas agendas pessoais continuam lá."
                  : "Você deixará de ver o grupo e precisará de um novo convite para voltar."}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 rounded-xl border border-zinc-700 px-3 py-2 text-sm"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleLeaveOrDelete()}
                  className="flex-1 rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                >
                  {actionBusy
                    ? "Aguarde..."
                    : confirmAction === "delete"
                      ? "Confirmar exclusão"
                      : "Confirmar saída"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && busy !== "edit") {
              setEditOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-editar-grupo"
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-7"
          >
            <h2 id="titulo-editar-grupo" className="text-xl font-semibold">
              Editar grupo
            </h2>

            <form onSubmit={handleEdit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="editar-nome-grupo"
                  className="mb-2 block text-sm font-medium"
                >
                  Nome do grupo
                </label>

                <input
                  id="editar-nome-grupo"
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-sky-500"
                />
              </div>

              <div>
                <label
                  htmlFor="editar-descricao-grupo"
                  className="mb-2 block text-sm font-medium"
                >
                  Descrição
                </label>

                <textarea
                  id="editar-descricao-grupo"
                  rows={3}
                  maxLength={300}
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-sky-500"
                />
              </div>

              {editError && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
                >
                  {editError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy === "edit"}
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={busy === "edit"}
                  className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "edit" ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

type SwitchRowProps = {
  label: string;
  enabled: boolean;
  disabled: boolean;
  onClick: () => void;
};

function SwitchRow({ label, enabled, disabled, onClick }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-zinc-300">{label}</p>

      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={`${label}: ${enabled ? "ativado" : "desativado"}`}
        aria-pressed={enabled}
        className={`flow-setting-toggle relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "flow-setting-toggle-on" : ""
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span
          className={`flow-setting-thumb absolute top-1 h-5 w-5 rounded-full transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
