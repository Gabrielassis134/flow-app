"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Priority = "Alta" | "Média" | "Baixa";

type Task = {
  id: number;
  title: string;
  description: string;
  date: string;
  durationMinutes: number;
  duration: string;
  priority: Priority;
  category: string;
  hasTime: boolean;
  startTime: string;
  completed: boolean;
};

type Activity = {
  id: number;
  title: string;
  date: string;
  start: string;
  end: string;
  category: string;
  color: string;
};

type Suggestion = {
  task: Task;
  date: string;
  start: string;
  end: string;
};

const TASKS_KEY = "flow-tasks";
const ACTIVITIES_KEY = "flow-activities";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
  });
}

function priorityWeight(priority: Priority) {
  if (priority === "Alta") return 0;
  if (priority === "Média") return 1;
  return 2;
}

function overlaps(
  start: number,
  end: number,
  busyStart: number,
  busyEnd: number,
) {
  return start < busyEnd && end > busyStart;
}

function findAvailableSlots(
  date: string,
  durationMinutes: number,
  busyActivities: Activity[],
  generatedSuggestions: Suggestion[],
) {
  const slots: { date: string; start: string; end: string }[] = [];

  const busy = [
    ...busyActivities.filter((activity) => activity.date === date),
    ...generatedSuggestions
      .filter((suggestion) => suggestion.date === date)
      .map((suggestion) => ({
        start: suggestion.start,
        end: suggestion.end,
      })),
  ];

  for (let startMinutes = 7 * 60; startMinutes <= 21 * 60; startMinutes += 15) {
    const endMinutes = startMinutes + durationMinutes;

    if (endMinutes > 22 * 60) {
      continue;
    }

    const conflict = busy.some((item) =>
      overlaps(
        startMinutes,
        endMinutes,
        timeToMinutes(item.start),
        timeToMinutes(item.end),
      ),
    );

    if (!conflict) {
      slots.push({
        date,
        start: minutesToTime(startMinutes),
        end: minutesToTime(endMinutes),
      });
    }
  }

  return slots;
}

function scoreTimeSlot(startTime: string) {
  const startMinutes = timeToMinutes(startTime);
  const hour = startMinutes / 60;

  if (hour < 8) {
    return 40 - (8 - hour) * 20;
  }

  if (hour <= 18) {
    return 100 - Math.abs(hour - 13) * 3;
  }

  return 70 - (hour - 18) * 15;
}

function getActivityColor(category: string) {
  if (category === "Escola") return "border-l-sky-400";
  if (category === "Estudos") return "border-l-violet-400";
  if (category === "Igreja") return "border-l-amber-400";
  if (category === "Música") return "border-l-pink-400";
  if (category === "Robótica") return "border-l-emerald-400";
  return "border-l-zinc-400";
}

export default function PlanejamentoPage() {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [planningTasks, setPlanningTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedTasks = localStorage.getItem(TASKS_KEY);
    const savedActivities = localStorage.getItem(ACTIVITIES_KEY);

    if (!savedTasks) {
      setMessage("Você ainda não tem tarefas para planejar.");
      return;
    }

    try {
      const parsedTasks = JSON.parse(savedTasks);
      const parsedActivities = savedActivities
        ? JSON.parse(savedActivities)
        : [];

      if (!Array.isArray(parsedTasks)) {
        setMessage("Não foi possível carregar suas tarefas.");
        return;
      }

      const tasks: Task[] = parsedTasks.filter(
        (task) =>
          !task.completed &&
          !task.hasTime &&
          task.date &&
          task.durationMinutes > 0,
      );

      if (tasks.length === 0) {
        setPlanningTasks([]);
        setMessage("Não há tarefas sem horário para planejar.");
        return;
      }

      setPlanningTasks(tasks);

      const activities: Activity[] = Array.isArray(parsedActivities)
        ? parsedActivities
        : [];

      const scheduledTasks: Activity[] = parsedTasks
        .filter(
          (task) =>
            !task.completed &&
            task.hasTime &&
            task.date &&
            task.startTime &&
            task.durationMinutes > 0,
        )
        .map((task) => ({
          id: task.id + 2000000000000,
          title: task.title,
          date: task.date,
          start: task.startTime,
          end: addMinutesToTime(task.startTime, task.durationMinutes),
          category: task.category,
          color: getActivityColor(task.category),
        }));

      const busyActivities: Activity[] = [...activities, ...scheduledTasks];

      const orderedTasks = [...tasks].sort((a, b) => {
        const priorityDifference =
          priorityWeight(a.priority) - priorityWeight(b.priority);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return a.date.localeCompare(b.date);
      });

      const generatedSuggestions: Suggestion[] = [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const task of orderedTasks) {
        const deadline = new Date(`${task.date}T12:00:00`);

        if (deadline < today) {
          continue;
        }

        const availableSlots: Suggestion[] = [];

        for (
          let currentDate = new Date(today);
          currentDate <= deadline;
          currentDate = addDays(currentDate, 1)
        ) {
          const currentDateKey = dateKey(currentDate);

          const slots = findAvailableSlots(
            currentDateKey,
            task.durationMinutes,
            busyActivities,
            generatedSuggestions,
          );

          for (const slot of slots) {
            availableSlots.push({
              task,
              date: slot.date,
              start: slot.start,
              end: slot.end,
            });
          }
        }

        if (availableSlots.length > 0) {
          const bestSlot = [...availableSlots].sort(
            (a, b) => scoreTimeSlot(b.start) - scoreTimeSlot(a.start),
          )[0];

          generatedSuggestions.push(bestSlot);
        }
      }

      setSuggestions(generatedSuggestions);

      if (generatedSuggestions.length === 0) {
        setMessage(
          "Não encontrei horários livres antes dos prazos das suas tarefas.",
        );
      }
    } catch {
      setMessage("Não foi possível analisar suas tarefas.");
    }
  }, []);

  function acceptSuggestion(suggestion: Suggestion) {
    const savedTasks = localStorage.getItem(TASKS_KEY);

    if (!savedTasks) {
      return;
    }

    try {
      const tasks = JSON.parse(savedTasks);

      if (!Array.isArray(tasks)) {
        return;
      }

      const updatedTasks = tasks.map((task) =>
        task.id === suggestion.task.id
          ? {
              ...task,
              hasTime: true,
              startTime: suggestion.start,
              date: suggestion.date,
            }
          : task,
      );

      localStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));

      setSuggestions((current) =>
        current.filter((item) => item.task.id !== suggestion.task.id),
      );

      setPlanningTasks((current) =>
        current.filter((task) => task.id !== suggestion.task.id),
      );
    } catch {
      setMessage("Não foi possível aceitar a sugestão.");
    }
  }

  function rejectSuggestion(taskId: number) {
    setSuggestions((current) =>
      current.filter((item) => item.task.id !== taskId),
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-28 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button
          onClick={() => router.push("/tarefas")}
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          ← Voltar para tarefas
        </button>

        <header className="mt-6">
          <p className="text-sm text-zinc-500">Planejamento automático</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Organizar meu tempo
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            O Flow procura horários livres antes dos prazos e sugere onde
            encaixar suas tarefas.
          </p>
        </header>

        {planningTasks.length > 0 && (
          <section className="mt-8">
            <div className="mb-4">
              <p className="text-sm text-zinc-500">
                Tarefas aguardando planejamento
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {planningTasks.length}{" "}
                {planningTasks.length === 1
                  ? "tarefa precisa"
                  : "tarefas precisam"}{" "}
                de um horário
              </h2>
            </div>

            <div className="space-y-3">
              {planningTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium">{task.title}</h3>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>{task.category}</span>
                        <span>{task.duration}</span>
                        <span>Prazo: {formatDate(task.date)}</span>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
                      {task.priority}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="mt-8 space-y-4">
            {suggestions.map((suggestion) => (
              <article
                key={suggestion.task.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">Sugestão</p>

                    <h2 className="mt-1 text-lg font-medium">
                      {suggestion.task.title}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                      {suggestion.task.category} · {suggestion.task.duration}
                    </p>
                  </div>

                  <span className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
                    {suggestion.task.priority}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-zinc-950 p-4">
                  <p className="text-xs text-zinc-500">Horário sugerido</p>

                  <p className="mt-1 font-medium">
                    {formatDate(suggestion.date)}
                  </p>

                  <p className="mt-1 text-sm text-sky-300">
                    {suggestion.start} – {suggestion.end}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    Prazo: {formatDate(suggestion.task.date)}
                  </p>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => acceptSuggestion(suggestion)}
                    className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300"
                  >
                    Aceitar
                  </button>

                  <button
                    onClick={() => rejectSuggestion(suggestion.task.id)}
                    className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    Recusar
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {suggestions.length === 0 && (
          <section className="mt-8 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
            <p className="text-zinc-300">
              {message || "Tudo organizado por enquanto."}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500">Como o Flow está planejando</p>

          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>• tarefas de maior prioridade primeiro;</li>
            <li>• somente tarefas ainda sem horário;</li>
            <li>• sem sobrepor atividades existentes;</li>
            <li>• horários entre 07:00 e 22:00;</li>
            <li>• blocos de 15 minutos.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
