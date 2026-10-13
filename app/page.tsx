"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Activity } from "./lib/activities";
import { getSupabaseActivities } from "./lib/supabase-activities";
import { getTasks, type Task } from "./lib/tasks";
import { supabase } from "./lib/supabase";

type AgendaItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  category: string;
  type: "activity" | "task";
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getTaskEnd(task: Task) {
  if (!task.startTime) return "";

  return minutesToTime(
    timeToMinutes(task.startTime) + (Number(task.durationMinutes) || 0),
  );
}

function activityOccursOnDate(activity: Activity, date: Date) {
  const activityDate = new Date(`${activity.date}T00:00:00`);

  if (dateKey(date) < dateKey(activityDate)) return false;

  if (activity.recurrenceEnd === "date" && activity.recurrenceEndDate) {
    const recurrenceEndDate = new Date(
      `${activity.recurrenceEndDate}T00:00:00`,
    );

    if (dateKey(date) > dateKey(recurrenceEndDate)) return false;
  }

  const dayOfWeek = date.getDay();

  if (!activity.recurrence || activity.recurrence === "none") {
    return activity.date === dateKey(date);
  }

  if (activity.recurrence === "weekly") {
    return dayOfWeek === activityDate.getDay();
  }

  if (activity.recurrence === "weekdays") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  if (activity.recurrence === "custom") {
    return activity.recurrenceDays?.includes(dayOfWeek) ?? false;
  }

  return false;
}

function formatLongDate(date: Date) {
  const text = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getTimeUntil(start: string, now: Date) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(start);
  const difference = startMinutes - currentMinutes;

  if (difference <= 0) return "agora";
  if (difference < 60) return `em ${difference}min`;

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  if (minutes === 0) return `em ${hours}h`;

  return `em ${hours}h ${minutes}min`;
}

export default function Home() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setDataError("");

    try {
      const [loadedTasks, loadedActivities] = await Promise.all([
        getTasks(),
        getSupabaseActivities(),
      ]);

      setTasks(loadedTasks);
      setActivities(loadedActivities);
    } catch (error) {
      console.error("Erro ao carregar dados da página inicial:", error);

      setDataError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar seus dados.",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    void loadData();

    const clockInterval = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
        void loadData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(clockInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);

  const today = useMemo(() => {
    if (!now) return new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, [now]);

  const todayKey = dateKey(today);

  const todayActivities = useMemo(() => {
    return activities
      .filter((activity) => activityOccursOnDate(activity, today))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [activities, todayKey]);

  const todayTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.completed && task.date === todayKey)
      .sort((a, b) => {
        if (a.hasTime && a.startTime && b.hasTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }

        if (a.hasTime && a.startTime) return -1;
        if (b.hasTime && b.startTime) return 1;

        return 0;
      });
  }, [tasks, todayKey]);

  const scheduledTodayTasks = useMemo(() => {
    return todayTasks.filter((task) => task.hasTime && task.startTime);
  }, [todayTasks]);

  const agendaItems = useMemo<AgendaItem[]>(() => {
    const activityItems: AgendaItem[] = todayActivities.map((activity) => ({
      id: `activity-${activity.id}`,
      title: activity.title,
      start: activity.start,
      end: activity.end,
      category: activity.category,
      type: "activity",
    }));

    const taskItems: AgendaItem[] = scheduledTodayTasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      start: task.startTime || "",
      end: getTaskEnd(task),
      category: task.category || "Tarefa",
      type: "task",
    }));

    return [...activityItems, ...taskItems].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
  }, [todayActivities, scheduledTodayTasks]);

  const nextItem = useMemo(() => {
    if (!now) return null;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return (
      agendaItems.find((item) => timeToMinutes(item.start) >= currentMinutes) ??
      null
    );
  }, [agendaItems, now]);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.completed)
      .sort((a, b) => {
        const dateA = a.date || "9999-12-31";
        const dateB = b.date || "9999-12-31";

        return dateA.localeCompare(dateB);
      })
      .slice(0, 4);
  }, [tasks]);

  const greeting = now ? getGreeting(now.getHours()) : "Olá";

  return (
    <main className="min-h-screen bg-zinc-950 pb-12 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Seu planejamento</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {greeting} 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400 sm:text-base">
              Aqui está um resumo do que está acontecendo com você hoje.
            </p>
          </div>

          <Link
            href="/configuracoes"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium transition hover:bg-zinc-800"
          >
            Configurações
          </Link>
        </header>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">Hoje</p>
              <h2 className="mt-1 text-xl font-semibold">
                {formatLongDate(today)}
              </h2>
            </div>

            <Link
              href="/agenda"
              className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
            >
              Ver agenda →
            </Link>
          </div>

          {dataError && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
            >
              <p>Não foi possível atualizar os dados da página inicial.</p>
              <p className="mt-1 break-words">{dataError}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-3 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </section>

        <section className="mt-6">
          <Link
            href="/agenda"
            className="block rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900 sm:p-6"
          >
            {loadingData ? (
              <>
                <p className="text-sm text-zinc-400">Próxima atividade</p>
                <h3 className="mt-2 text-xl font-semibold">
                  Carregando sua agenda...
                </h3>
              </>
            ) : nextItem ? (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-400">Próxima atividade</p>
                  <h3 className="mt-2 truncate text-xl font-semibold sm:text-2xl">
                    {nextItem.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Hoje · {nextItem.start}
                    {nextItem.end ? ` – ${nextItem.end}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {nextItem.category}
                    {nextItem.type === "task" ? " · Tarefa" : ""}
                  </p>
                </div>

                <div className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-center sm:px-5">
                  <p className="text-xs text-zinc-500">Em</p>
                  <p className="mt-1 text-sm font-semibold sm:text-base">
                    {now ? getTimeUntil(nextItem.start, now) : "..."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-400">Próxima atividade</p>
                <h3 className="mt-2 text-xl font-semibold sm:text-2xl">
                  Nada agendado por enquanto
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Seu dia está livre. Aproveite ou planeje alguma coisa.
                </p>
                <span className="mt-4 inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800">
                  + Planejar atividade
                </span>
              </>
            )}
          </Link>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Sua rotina</p>
                <h2 className="mt-1 text-xl font-semibold">Agenda de hoje</h2>
              </div>
              <span className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-400">
                {agendaItems.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {loadingData ? (
                <div className="rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-500">
                  Carregando agenda...
                </div>
              ) : agendaItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-5 text-center">
                  <p className="text-sm text-zinc-400">
                    Nenhuma atividade agendada para hoje.
                  </p>
                  <Link
                    href="/criar/compromisso"
                    className="mt-3 inline-block text-sm text-sky-300 hover:text-sky-200"
                  >
                    + Adicionar atividade
                  </Link>
                </div>
              ) : (
                agendaItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:gap-4 sm:p-4"
                  >
                    <div className="w-12 shrink-0 pt-0.5 text-sm font-medium text-zinc-400 sm:w-14">
                      {item.start}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {item.category}
                        {item.type === "task" ? " · Tarefa" : ""}
                      </p>
                      {item.end && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Até {item.end}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/agenda"
              className="mt-4 inline-flex text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Abrir agenda completa →
            </Link>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">Seu planejamento</p>
                <h2 className="mt-1 text-xl font-semibold">
                  Tarefas pendentes
                </h2>
              </div>
              <Link
                href="/tarefas"
                className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Ver todas
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {loadingData ? (
                <div className="rounded-2xl border border-zinc-800 p-4 text-sm text-zinc-500">
                  Carregando tarefas...
                </div>
              ) : pendingTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-5 text-center">
                  <p className="text-sm text-zinc-400">
                    Você não tem tarefas pendentes.
                  </p>
                  <Link
                    href="/criar"
                    className="mt-3 inline-block text-sm text-sky-300 hover:text-sky-200"
                  >
                    + Criar tarefa
                  </Link>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <Link
                    href="/tarefas"
                    key={task.id}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 transition hover:bg-zinc-800/70 sm:p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-sm text-zinc-300">
                      {task.priority === "Alta"
                        ? "!"
                        : task.priority === "Média"
                          ? "•"
                          : "–"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {task.duration ||
                          (task.durationMinutes
                            ? `${task.durationMinutes} min`
                            : "Sem duração")}{" "}
                        · {task.priority}
                      </p>
                    </div>

                    <span className="shrink-0 text-zinc-500">›</span>
                  </Link>
                ))
              )}
            </div>

            <Link
              href="/tarefas"
              className="mt-4 inline-flex text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Abrir lista de tarefas →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
