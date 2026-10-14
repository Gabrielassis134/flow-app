"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  getGroupDetails,
  getMyGroups,
  type GroupMember,
  type GroupSummary,
} from "../../lib/groups";
import {
  checkAvailability,
  createGroupItem,
  type AvailabilityResult,
  type ItemKind,
} from "../../lib/group-items";
import { dateKey, timeToMinutes } from "../../lib/schedule";
import type { Priority } from "../../lib/tasks";

const CATEGORIES = [
  "Pessoal",
  "Estudos",
  "Trabalho",
  "Escola",
  "Igreja",
  "Robótica",
  "Academia",
  "Outro",
];

const PRIORITIES: Priority[] = ["Alta", "Média", "Baixa"];

const inputClass =
  "mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600";

function memberLabel(member: GroupMember) {
  return member.displayName || member.username || "Participante";
}

function priorityButtonClass(priority: Priority, selected: boolean) {
  if (!selected) {
    return "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700";
  }

  if (priority === "Alta") {
    return "border-rose-400 bg-rose-400/10 text-rose-300";
  }

  if (priority === "Média") {
    return "border-amber-400 bg-amber-400/10 text-amber-300";
  }

  return "border-emerald-400 bg-emerald-400/10 text-emerald-300";
}

export default function CriarItemGrupoPage() {
  // useSearchParams exige um limite de Suspense no build do Next.
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-6 py-8 text-sm text-zinc-400">
          Carregando...
        </main>
      }
    >
      <CriarItemGrupoForm />
    </Suspense>
  );
}

function CriarItemGrupoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetGroupId = searchParams.get("grupo") ?? "";

  const today = dateKey(new Date());

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [groupId, setGroupId] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [meId, setMeId] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [kind, setKind] = useState<ItemKind>("activity");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Pessoal");
  const [priority, setPriority] = useState<Priority>("Média");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [hasTime, setHasTime] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [busyMembers, setBusyMembers] = useState<AvailabilityResult[] | null>(
    null,
  );
  const [sentCount, setSentCount] = useState<number | null>(null);

  // Grupos em que a pessoa pode criar itens (dono ou administrador).
  useEffect(() => {
    let active = true;

    async function loadGroups() {
      try {
        const all = await getMyGroups();
        const allowed = all.filter((group) => group.myRole !== "member");

        if (!active) return;

        setGroups(allowed);

        const preset = allowed.find((group) => group.id === presetGroupId);

        if (preset) {
          setGroupId(preset.id);
        } else if (allowed.length === 1) {
          setGroupId(allowed[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar grupos:", err);

        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar seus grupos.",
          );
        }
      } finally {
        if (active) setLoadingGroups(false);
      }
    }

    void loadGroups();

    return () => {
      active = false;
    };
  }, [presetGroupId]);

  // Membros do grupo escolhido.
  useEffect(() => {
    setSelected([]);
    setMembers([]);

    if (!groupId) return;

    let active = true;

    setLoadingMembers(true);

    getGroupDetails(groupId)
      .then((details) => {
        if (!active || !details) return;

        setMembers(details.members);
        setMeId(details.me.userId);
      })
      .catch((err) => {
        console.error("Erro ao carregar membros:", err);

        if (active) {
          setSendError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar os membros do grupo.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingMembers(false);
      });

    return () => {
      active = false;
    };
  }, [groupId]);

  function toggleMember(userId: string) {
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function toggleAll() {
    setSelected((current) =>
      current.length === members.length ? [] : members.map((m) => m.userId),
    );
  }

  const isTimed = kind === "activity" || hasTime;

  function getDuration() {
    return kind === "activity"
      ? timeToMinutes(endTime) - timeToMinutes(startTime)
      : durationHours * 60 + durationMinutes;
  }

  function validate(): string | null {
    if (!groupId) return "Escolha o grupo.";
    if (!title.trim()) return "Informe o título.";
    if (selected.length === 0) return "Escolha pelo menos um participante.";
    if (!date) return "Informe a data.";
    if (date < today) return "A data não pode ser anterior a hoje.";

    if (kind === "activity") {
      if (!startTime || !endTime) return "Informe o início e o término.";

      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        return "O término deve ser posterior ao início.";
      }
    } else {
      if (getDuration() <= 0) return "A duração deve ser maior que zero.";
      if (hasTime && !startTime) return "Informe o horário de início.";
    }

    if (isTimed && date === today) {
      const now = new Date();

      if (timeToMinutes(startTime) < now.getHours() * 60 + now.getMinutes()) {
        return "O horário de início já passou. Escolha um horário futuro.";
      }
    }

    return null;
  }

  async function submit(force = false) {
    if (sending) return;

    setSendError("");

    const problem = validate();

    if (problem) {
      setSendError(problem);
      return;
    }

    setSending(true);

    try {
      const duration = getDuration();

      // Com horário definido, confere se todos estão livres. Quem estiver
      // ocupado aparece só pelo nome, sem dizer qual compromisso tem.
      if (isTimed && !force) {
        const results = await checkAvailability({
          groupId,
          userIds: selected,
          date,
          start: startTime,
          durationMinutes: duration,
        });

        const busy = results.filter((result) => result.busy);

        if (busy.length > 0) {
          setBusyMembers(busy);
          return;
        }
      }

      await createGroupItem({
        groupId,
        kind,
        title: title.trim(),
        description: kind === "task" ? description : "",
        category,
        date,
        startTime: isTimed ? startTime : null,
        endTime: kind === "activity" ? endTime : null,
        durationMinutes: duration,
        priority,
        hasTime: isTimed,
        participantIds: selected,
      });

      setSentCount(selected.length);
    } catch (err) {
      console.error("Erro ao criar item do grupo:", err);

      setSendError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar. Tente novamente.",
      );
    } finally {
      setSending(false);
    }
  }

  function resetForNewItem() {
    setSentCount(null);
    setTitle("");
    setDescription("");
    setSelected([]);
    setBusyMembers(null);
    setSendError("");
  }

  if (sentCount !== null) {
    return (
      <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <p className="text-3xl" aria-hidden="true">
              ✓
            </p>

            <h1 className="mt-4 text-2xl font-semibold">Pedido enviado</h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {sentCount === 1
                ? "1 pessoa recebeu"
                : `${sentCount} pessoas receberam`}{" "}
              o pedido na caixa de entrada. Quando aceitar, o{" "}
              {kind === "activity"
                ? "compromisso entra na agenda"
                : "item entra nas tarefas"}{" "}
              dela.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/grupos/${groupId}`}
                className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white"
              >
                Voltar ao grupo
              </Link>

              <button
                type="button"
                onClick={resetForNewItem}
                className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Criar outro
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <header>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-500 transition hover:text-zinc-200"
          >
            ← Voltar
          </button>

          <p className="mt-8 text-sm text-zinc-500">Nova criação</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Atividade de grupo
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Escolha quem participa. Cada pessoa recebe um pedido e decide se
            aceita.
          </p>
        </header>

        {loadError && (
          <p
            role="alert"
            className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
          >
            {loadError}
          </p>
        )}

        {loadingGroups ? (
          <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-400">
            Carregando grupos...
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
            <p className="text-zinc-300">
              Você não é administrador de nenhum grupo.
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Crie um grupo ou peça ao dono para torná-lo administrador.
            </p>

            <Link
              href="/grupos"
              className="mt-5 inline-block rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950"
            >
              Ir para Grupos
            </Link>
          </div>
        ) : (
          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
            <div>
              <label
                htmlFor="grupo"
                className="text-sm font-medium text-zinc-300"
              >
                Grupo
              </label>

              <select
                id="grupo"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className={inputClass}
              >
                <option value="">Escolha um grupo</option>

                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-zinc-950 p-1">
              {(
                [
                  ["activity", "Compromisso"],
                  ["task", "Tarefa"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  aria-pressed={kind === value}
                  className={`rounded-xl px-3 py-2.5 text-sm transition ${
                    kind === value
                      ? "bg-zinc-800 font-medium text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <label
                htmlFor="titulo"
                className="text-sm font-medium text-zinc-300"
              >
                {kind === "activity" ? "Nome do compromisso" : "Nome da tarefa"}
              </label>

              <input
                id="titulo"
                type="text"
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  kind === "activity"
                    ? "Ex.: Reunião da equipe"
                    : "Ex.: Montar o relatório"
                }
                className={inputClass}
              />
            </div>

            {kind === "task" && (
              <div className="mt-5">
                <label
                  htmlFor="descricao"
                  className="text-sm font-medium text-zinc-300"
                >
                  Descrição
                  <span className="ml-2 text-xs font-normal text-zinc-600">
                    opcional
                  </span>
                </label>

                <textarea
                  id="descricao"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Detalhes para quem vai receber"
                  className={`${inputClass} resize-none`}
                />
              </div>
            )}

            <div className="mt-5">
              <label
                htmlFor="categoria"
                className="text-sm font-medium text-zinc-300"
              >
                Categoria
              </label>

              <select
                id="categoria"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            {kind === "task" && (
              <div className="mt-5">
                <p className="text-sm font-medium text-zinc-300">Prioridade</p>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {PRIORITIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPriority(item)}
                      className={`rounded-2xl border px-3 py-3 text-sm transition ${priorityButtonClass(
                        item,
                        priority === item,
                      )}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <label
                htmlFor="data"
                className="text-sm font-medium text-zinc-300"
              >
                {kind === "activity" ? "Data" : "Prazo"}
              </label>

              <input
                id="data"
                type="date"
                min={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </div>

            {kind === "activity" && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="inicio"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Início
                  </label>

                  <input
                    id="inicio"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="termino"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Término
                  </label>

                  <input
                    id="termino"
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {kind === "task" && (
              <>
                <div className="mt-5">
                  <p className="text-sm font-medium text-zinc-300">
                    Duração estimada
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <select
                      aria-label="Horas"
                      value={durationHours}
                      onChange={(event) =>
                        setDurationHours(Number(event.target.value))
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                    >
                      {Array.from({ length: 13 }, (_, hour) => (
                        <option key={hour} value={hour}>
                          {hour}h
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Minutos"
                      value={durationMinutes}
                      onChange={(event) =>
                        setDurationMinutes(Number(event.target.value))
                      }
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                    >
                      {[0, 15, 30, 45].map((minute) => (
                        <option key={minute} value={minute}>
                          {String(minute).padStart(2, "0")} min
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span>
                      <span className="block text-sm font-medium">
                        Definir horário
                      </span>

                      <span className="mt-1 block text-xs text-zinc-500">
                        {hasTime
                          ? "Vamos conferir a agenda de todos nesse horário."
                          : "Cada pessoa encaixa a tarefa quando puder."}
                      </span>
                    </span>

                    <input
                      type="checkbox"
                      checked={hasTime}
                      onChange={(event) => setHasTime(event.target.checked)}
                      className="h-5 w-5 shrink-0 accent-sky-500"
                    />
                  </label>

                  {hasTime && (
                    <div className="mt-4">
                      <label
                        htmlFor="hora-tarefa"
                        className="text-xs text-zinc-500"
                      >
                        Hora de início
                      </label>

                      <input
                        id="hora-tarefa"
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-300">
                  Participantes
                  {selected.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {selected.length} selecionado
                      {selected.length === 1 ? "" : "s"}
                    </span>
                  )}
                </p>

                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-sm text-sky-300 transition hover:text-sky-200"
                  >
                    {selected.length === members.length
                      ? "Limpar seleção"
                      : "Selecionar todos"}
                  </button>
                )}
              </div>

              {!groupId ? (
                <p className="mt-3 rounded-2xl border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-500">
                  Escolha um grupo para ver os membros.
                </p>
              ) : loadingMembers ? (
                <p className="mt-3 rounded-2xl border border-zinc-800 p-4 text-center text-sm text-zinc-500">
                  Carregando membros...
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {members.map((member) => {
                    const checked = selected.includes(member.userId);

                    return (
                      <li key={member.userId}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                            checked
                              ? "border-sky-400/60 bg-sky-400/5"
                              : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(member.userId)}
                            className="h-5 w-5 shrink-0 accent-sky-500"
                          />

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-sm font-semibold">
                            {memberLabel(member).charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {memberLabel(member)}
                              {member.userId === meId && (
                                <span className="ml-2 text-xs font-normal text-zinc-500">
                                  (você)
                                </span>
                              )}
                            </p>

                            {member.username && (
                              <p className="truncate text-xs text-zinc-500">
                                @{member.username}
                              </p>
                            )}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {sendError && (
              <p
                role="alert"
                className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
              >
                {sendError}
              </p>
            )}

            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={sending || !groupId}
              className="mt-8 w-full rounded-2xl bg-zinc-100 px-4 py-3 font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "Verificando..." : "Enviar para os participantes"}
            </button>
          </section>
        )}
      </div>

      {busyMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-conflito"
            className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-xl text-amber-300">
              !
            </div>

            <h2 id="titulo-conflito" className="mt-5 text-xl font-semibold">
              Nem todos estão disponíveis
            </h2>

            <ul className="mt-4 space-y-2">
              {busyMembers.map((member) => (
                <li
                  key={member.memberId}
                  className="rounded-2xl bg-zinc-950 p-3 text-sm text-zinc-200"
                >
                  {member.memberId === meId ? "Você" : member.name} não está
                  disponível no momento.
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Você pode trocar o horário ou marcar assim mesmo. Se marcar, todos
              recebem o pedido, e quem estiver ocupado decide se aceita mesmo
              assim ou recusa.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setBusyMembers(null)}
                className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Trocar horário
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  setBusyMembers(null);
                  void submit(true);
                }}
                className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-50"
              >
                Marcar neste horário
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
