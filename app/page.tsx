"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  getSavedActivities,
} from "./lib/activities";

type Task = {
  id: number;
  title: string;
  date: string;
  deadline?: string;
  duration?: string;
  durationMinutes?: number;
  priority: string;
  category?: string;
  completed?: boolean;
  hasTime?: boolean;
  startTime?: string;
};

type AgendaItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  category: string;
  type: "activity" | "task";
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
}

function getTaskEnd(task: Task) {
  if (!task.startTime) {
    return "";
  }

  const durationMinutes =
    Number(task.durationMinutes) || 0;

  const startMinutes = timeToMinutes(task.startTime);

  return minutesToTime(startMinutes + durationMinutes);
}

function activityOccursOnDate(
  activity: Activity,
  date: Date
) {
  const activityDate = new Date(
    `${activity.date}T00:00:00`
  );

  if (date < activityDate) {
    return false;
  }

  if (
    activity.recurrenceEnd === "date" &&
    activity.recurrenceEndDate
  ) {
    const recurrenceEndDate = new Date(
      `${activity.recurrenceEndDate}T00:00:00`
    );

    if (date > recurrenceEndDate) {
      return false;
    }
  }

  const dayOfWeek = date.getDay();

  if (
    !activity.recurrence ||
    activity.recurrence === "none"
  ) {
    return activity.date === dateKey(date);
  }

  if (activity.recurrence === "weekly") {
    return dayOfWeek === activityDate.getDay();
  }

  if (activity.recurrence === "weekdays") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  if (activity.recurrence === "custom") {
    return (
      activity.recurrenceDays?.includes(dayOfWeek) ??
      false
    );
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
  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function getTimeUntil(start: string, now: Date) {
  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  const startMinutes = timeToMinutes(start);

  const difference = startMinutes - currentMinutes;

  if (difference <= 0) {
    return "agora";
  }

  if (difference < 60) {
    return `em ${difference}min`;
  }

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  if (minutes === 0) {
    return `em ${hours}h`;
  }

  return `em ${hours}h ${minutes}min`;
}

export default function Home() {
  const [activities, setActivities] = useState<Activity[]>(
    []
  );

  const [tasks, setTasks] = useState<Task[]>([]);

  const [now, setNow] = useState<Date | null>(null);

  function loadData() {
    setActivities(getSavedActivities());

    const savedTasks =
      localStorage.getItem("flow-tasks");

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);

        setTasks(
          Array.isArray(parsedTasks)
            ? parsedTasks
            : []
        );
      } catch {
        setTasks([]);
      }
    } else {
      setTasks([]);
    }
  }

  useEffect(() => {
    const currentDate = new Date();

    setNow(currentDate);
    loadData();

    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    const handleStorage = () => {
      loadData();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  const today = useMemo(() => {
    if (!now) {
      return new Date();
    }

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }, [now]);

  const todayKey = dateKey(today);

  const todayActivities = useMemo(() => {
    return activities
      .filter((activity) =>
        activityOccursOnDate(activity, today)
      )
      .sort((a, b) =>
        a.start.localeCompare(b.start)
      );
  }, [activities, todayKey]);

  const todayTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.completed) {
          return false;
        }

        const taskDate =
          task.date || task.deadline;

        return taskDate === todayKey;
      })
      .sort((a, b) => {
        if (
          a.hasTime &&
          a.startTime &&
          b.hasTime &&
          b.startTime
        ) {
          return a.startTime.localeCompare(
            b.startTime
          );
        }

        if (a.hasTime && a.startTime) {
          return -1;
        }

        if (b.hasTime && b.startTime) {
          return 1;
        }

        return 0;
      });
  }, [tasks, todayKey]);

  const scheduledTodayTasks = useMemo(() => {
    return todayTasks.filter(
      (task) =>
        task.hasTime &&
        task.startTime
    );
  }, [todayTasks]);

  const agendaItems = useMemo<AgendaItem[]>(() => {
    const activityItems: AgendaItem[] =
      todayActivities.map((activity) => ({
        id: `activity-${activity.id}`,
        title: activity.title,
        start: activity.start,
        end: activity.end,
        category: activity.category,
        type: "activity",
      }));

    const taskItems: AgendaItem[] =
      scheduledTodayTasks.map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        start: task.startTime || "",
        end: getTaskEnd(task),
        category:
          task.category || "Tarefa",
        type: "task",
      }));

    return [
      ...activityItems,
      ...taskItems,
    ].sort((a, b) =>
      a.start.localeCompare(b.start)
    );
  }, [
    todayActivities,
    scheduledTodayTasks,
  ]);

  const nextItem = useMemo(() => {
    if (!now) {
      return null;
    }

    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    const futureItems = agendaItems.filter(
      (item) =>
        timeToMinutes(item.start) >=
        currentMinutes
    );

    return futureItems[0] ?? null;
  }, [agendaItems, now]);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.completed)
      .sort((a, b) => {
        const dateA =
          a.date || a.deadline || "9999-12-31";

        const dateB =
          b.date || b.deadline || "9999-12-31";

        return dateA.localeCompare(dateB);
      })
      .slice(0, 4);
  }, [tasks]);

  const greeting = now
    ? getGreeting(now.getHours())
    : "Olá";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 pb-32">

        {/* Cabeçalho */}
        <header className="flex items-center justify-between">
          <Link href="/">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Flow
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Organize sua rotina. Viva seu tempo.
              </p>
            </div>
          </Link>

          <Link
            href="/configuracoes"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Configurações
          </Link>
        </header>

        {/* Saudação */}
        <section className="mt-12">
          <p className="text-sm text-zinc-400">
            {formatLongDate(today)}
          </p>

          <h2 className="mt-2 text-4xl font-semibold tracking-tight">
            {greeting} 👋
          </h2>

          <p className="mt-3 max-w-xl text-zinc-400">
            Aqui está um resumo do que está acontecendo
            com você hoje.
          </p>
        </section>

        {/* Próxima atividade */}
        <section className="mt-10">
          <Link href="/agenda">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl transition hover:border-zinc-700 hover:bg-zinc-900">
              {nextItem ? (
                <div className="flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-400">
                      Próxima atividade
                    </p>

                    <h3 className="mt-2 truncate text-2xl font-medium">
                      {nextItem.title}
                    </h3>

                    <p className="mt-2 text-sm text-zinc-400">
                      Hoje · {nextItem.start}
                      {nextItem.end
                        ? ` – ${nextItem.end}`
                        : ""}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-zinc-800 px-4 py-3 text-center">
                    <p className="text-xs text-zinc-400">
                      Em
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {now
                        ? getTimeUntil(
                            nextItem.start,
                            now
                          )
                        : "..."}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-zinc-400">
                    Próxima atividade
                  </p>

                  <h3 className="mt-2 text-2xl font-medium">
                    Nada agendado por enquanto
                  </h3>

                  <p className="mt-2 text-sm text-zinc-400">
                    Seu dia está livre. Aproveite ou
                    planeje alguma coisa.
                  </p>
                </div>
              )}
            </div>
          </Link>
        </section>

        {/* Resumo */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">

          {/* Agenda */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Hoje
              </h3>

              <Link
                href="/agenda"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Ver agenda
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {agendaItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-center">
                  <p className="text-sm text-zinc-500">
                    Nenhuma atividade agendada para hoje.
                  </p>
                </div>
              ) : (
                agendaItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4"
                  >
                    <div className="w-14 shrink-0 text-sm text-zinc-500">
                      {item.start}
                    </div>

                    <div className="min-w-0 flex-1 rounded-2xl bg-zinc-800/70 p-4">
                      <p className="truncate font-medium">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {item.category}
                        {item.type === "task"
                          ? " · Tarefa"
                          : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tarefas */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Tarefas
              </h3>

              <Link
                href="/tarefas"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Ver todas
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {pendingTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-center">
                  <p className="text-sm text-zinc-500">
                    Você não tem tarefas pendentes.
                  </p>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <Link
                    href="/tarefas"
                    key={task.id}
                    className="flex items-center gap-3 rounded-2xl bg-zinc-800/70 p-4 transition hover:bg-zinc-800"
                  >
                    <div className="h-5 w-5 shrink-0 rounded-full border border-zinc-600" />

                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {task.title}
                      </p>

                      <p className="text-sm text-zinc-400">
                        {task.duration ||
                          (task.durationMinutes
                            ? `${task.durationMinutes}min`
                            : "Sem duração")}{" "}
                        · {task.priority}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}