"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getCategoryColor, type Activity } from "../lib/activities";
import {
  getMyItemRequests,
  notifyInboxChanged,
  respondGroupItem,
  type ItemRequest,
} from "../lib/group-items";
import {
  getMyGroupInvites,
  respondGroupInvite,
  type ReceivedGroupInvite,
} from "../lib/groups";
import { findConflict, timeToMinutes, type BusyItem } from "../lib/schedule";
import { getSupabaseActivities } from "../lib/supabase-activities";
import { getTasks, type Task } from "../lib/tasks";

type Feedback = { tipo: "erro" | "sucesso"; texto: string } | null;

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "";

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;

  return `${hours}h ${String(rest).padStart(2, "0")}min`;
}

function priorityClass(priority: ItemRequest["priority"]) {
  if (priority === "Alta") return "bg-rose-400/10 text-rose-300";
  if (priority === "Média") return "bg-amber-400/10 text-amber-300";

  return "bg-emerald-400/10 text-emerald-300";
}

export default function CaixaDeEntradaPage() {
  const [invites, setInvites] = useState<ReceivedGroupInvite[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const [loadedInvites, loadedRequests, loadedActivities, loadedTasks] =
        await Promise.all([
          getMyGroupInvites(),
          getMyItemRequests(),
          getSupabaseActivities(),
          getTasks(),
        ]);

      setInvites(loadedInvites);
      setRequests(loadedRequests);
      setActivities(loadedActivities);
      setTasks(loadedTasks);
    } catch (err) {
      console.error("Erro ao carregar a caixa de entrada:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar a caixa de entrada.",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // O conflito é calculado só com a agenda de quem está lendo.
  const conflicts = useMemo(() => {
    const result = new Map<string, BusyItem>();

    for (const request of requests) {
      if (!request.hasTime || !request.startTime) continue;

      const duration =
        request.kind === "activity" && request.endTime
          ? timeToMinutes(request.endTime) - timeToMinutes(request.startTime)
          : (request.durationMinutes ?? 0);

      const conflict = findConflict({
        date: request.date,
        start: request.startTime,
        durationMinutes: duration,
        activities,
        tasks,
      });

      if (conflict) result.set(request.itemId, conflict);
    }

    return result;
  }, [requests, activities, tasks]);

  async function handleInvite(invite: ReceivedGroupInvite, accept: boolean) {
    setBusyKey(`invite-${invite.id}`);
    setFeedback(null);

    try {
      await respondGroupInvite(invite.id, accept);
      notifyInboxChanged();

      setFeedback({
        tipo: "sucesso",
        texto: accept
          ? `Você entrou no grupo ${invite.groupName}.`
          : "Convite recusado.",
      });

      await load(true);
    } catch (err) {
      console.error("Erro ao responder convite:", err);

      setFeedback({
        tipo: "erro",
        texto:
          err instanceof Error
            ? err.message
            : "Não foi possível responder ao convite.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRequest(request: ItemRequest, accept: boolean) {
    setBusyKey(`item-${request.itemId}`);
    setFeedback(null);

    try {
      await respondGroupItem(
        request.itemId,
        accept,
        getCategoryColor(request.category),
      );
      notifyInboxChanged();

      setFeedback({
        tipo: "sucesso",
        texto: !accept
          ? "Pedido recusado."
          : request.kind === "activity"
            ? "Compromisso adicionado à sua agenda."
            : "Tarefa adicionada às suas tarefas.",
      });

      await load(true);
    } catch (err) {
      console.error("Erro ao responder pedido:", err);

      setFeedback({
        tipo: "erro",
        texto:
          err instanceof Error
            ? err.message
            : "Não foi possível responder ao pedido.",
      });
    } finally {
      setBusyKey(null);
    }
  }

  const isEmpty = invites.length === 0 && requests.length === 0;

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header>
          <p className="text-sm text-zinc-500">Notificações</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Caixa de entrada
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Convites de grupo e pedidos de compromissos e tarefas.
          </p>
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

        {loading ? (
          <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-400">
            Carregando...
          </div>
        ) : isEmpty && !error ? (
          <div className="mt-8 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
            <p className="text-zinc-300">Sua caixa de entrada está vazia.</p>

            <p className="mt-2 text-sm text-zinc-500">
              Quando alguém convidar você ou pedir um compromisso, aparece aqui.
            </p>
          </div>
        ) : (
          <>
            {invites.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-medium">Convites de grupo</h2>

                <div className="mt-4 space-y-3">
                  {invites.map((invite) => {
                    const key = `invite-${invite.id}`;

                    return (
                      <article
                        key={invite.id}
                        className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
                      >
                        <p className="text-xs text-zinc-500">Convite</p>

                        <h3 className="mt-1 break-words text-lg font-medium">
                          {invite.groupName}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-400">
                          {invite.invitedByName} convidou você para participar.
                        </p>

                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void handleInvite(invite, true)}
                            className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:opacity-50"
                          >
                            {busyKey === key ? "Salvando..." : "Aceitar"}
                          </button>

                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void handleInvite(invite, false)}
                            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Recusar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {requests.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-medium">Compromissos e tarefas</h2>

                <div className="mt-4 space-y-3">
                  {requests.map((request) => {
                    const key = `item-${request.itemId}`;
                    const conflict = conflicts.get(request.itemId);
                    const isActivity = request.kind === "activity";

                    return (
                      <article
                        key={request.itemId}
                        className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-500">
                              {request.createdByName} · {request.groupName}
                            </p>

                            <h3 className="mt-1 break-words text-lg font-medium">
                              {request.title}
                            </h3>
                          </div>

                          <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                            {isActivity ? "Compromisso" : "Tarefa"}
                          </span>
                        </div>

                        {request.description && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-400">
                            {request.description}
                          </p>
                        )}

                        <div className="mt-4 rounded-2xl bg-zinc-950 p-4 text-sm">
                          <p className="text-xs text-zinc-500">
                            {isActivity ? "Quando" : "Prazo"}
                          </p>

                          <p className="mt-1 font-medium capitalize">
                            {formatDate(request.date)}
                          </p>

                          {request.hasTime && request.startTime && (
                            <p className="mt-1 text-sky-300">
                              {request.startTime}
                              {request.endTime ? ` – ${request.endTime}` : ""}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
                              {request.category}
                            </span>

                            {!isActivity && request.durationMinutes && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
                                {formatDuration(request.durationMinutes)}
                              </span>
                            )}

                            {!isActivity && (
                              <span
                                className={`rounded-full px-3 py-1 ${priorityClass(request.priority)}`}
                              >
                                {request.priority}
                              </span>
                            )}
                          </div>
                        </div>

                        {conflict && (
                          <p
                            role="alert"
                            className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200"
                          >
                            Você já tem “{conflict.title}” nesse horário (
                            {conflict.start} – {conflict.end}). Pode aceitar
                            mesmo assim ou recusar.
                          </p>
                        )}

                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void handleRequest(request, true)}
                            className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:opacity-50"
                          >
                            {busyKey === key
                              ? "Salvando..."
                              : conflict
                                ? "Aceitar mesmo assim"
                                : "Aceitar"}
                          </button>

                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void handleRequest(request, false)}
                            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Recusar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        <p className="mt-10 text-center text-sm text-zinc-600">
          <Link href="/grupos" className="transition hover:text-zinc-300">
            Ir para Grupos
          </Link>
        </p>
      </div>
    </main>
  );
}
