"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseActivities } from "../lib/supabase-activities";
import { getTasks, type Task } from "../lib/tasks";
import { supabase } from "../lib/supabase";

type Priority = "Alta" | "Média" | "Baixa";

type BusyActivity = {
  date: string;
  start: string;
  end: string;
};

type Suggestion = {
  task: Task;
  date: string;
  start: string;
  end: string;
};

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
  if (!date) return "Sem data";

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
  busyActivities: BusyActivity[],
  generatedSuggestions: Suggestion[],
  earliestStartMinutes: number,
) {
  const slots: { date: string; start: string; end: string }[] = [];

  const busy: BusyActivity[] = [
    ...busyActivities.filter((activity) => activity.date === date),
    ...generatedSuggestions
      .filter((suggestion) => suggestion.date === date)
      .map((suggestion) => ({
        date: suggestion.date,
        start: suggestion.start,
        end: suggestion.end,
      })),
  ];

  const firstStart = Math.max(
    7 * 60,
    Math.ceil(earliestStartMinutes / 15) * 15,
  );

  for (
    let startMinutes = firstStart;
    startMinutes <= 21 * 60;
    startMinutes += 15
  ) {
    const endMinutes = startMinutes + durationMinutes;

    if (endMinutes > 22 * 60) continue;

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
  const hour = timeToMinutes(startTime) / 60;

  if (hour < 8) return 40 - (8 - hour) * 20;
  if (hour <= 18) return 100 - Math.abs(hour - 13) * 3;
  return 70 - (hour - 18) * 15;
}

function priorityClass(priority: Priority) {
  if (priority === "Alta") return "bg-rose-400/10 text-rose-300";
  if (priority === "Média") return "bg-amber-400/10 text-amber-300";
  return "bg-emerald-400/10 text-emerald-300";
}

export default function PlanejamentoPage() {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [planningTasks, setPlanningTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPlanning = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [tasks, savedActivities] = await Promise.all([
        getTasks(),
        getSupabaseActivities(),
      ]);

      const pendingTasks = tasks.filter(
        (task) =>
          !task.completed &&
          !task.hasTime &&
          task.date &&
          task.durationMinutes > 0,
      );

      setPlanningTasks(pendingTasks);

      if (pendingTasks.length === 0) {
        setSuggestions([]);
        setMessage("Não há tarefas sem horário para planejar.");
        return;
      }

      const busyActivities: BusyActivity[] = savedActivities.map(
        (activity) => ({
          date: activity.date,
          start: activity.start,
          end: activity.end,
        }),
      );

      // Tarefas com horário já reservado também ocupam espaço na Agenda.
      for (const task of tasks) {
        if (
          !task.completed &&
          task.hasTime &&
          task.startTime &&
          task.date &&
          task.durationMinutes > 0
        ) {
          busyActivities.push({
            date: task.date,
            start: task.startTime,
            end: addMinutesToTime(task.startTime, task.durationMinutes),
          });
        }
      }

      const orderedTasks = [...pendingTasks].sort((a, b) => {
        const priorityDifference =
          priorityWeight(a.priority) - priorityWeight(b.priority);

        if (priorityDifference !== 0) return priorityDifference;
        return a.date.localeCompare(b.date);
      });

      const generatedSuggestions: Suggestion[] = [];

      // Captura o momento atual e mantém o início do dia para percorrer as datas.
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      // Arredonda para o próximo intervalo de 15 minutos.
      // Ex.: 14:07 -> 14:15; 14:15 -> 14:30.
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const earliestTodayMinutes = Math.ceil((currentMinutes + 1) / 15) * 15;

      for (const task of orderedTasks) {
        const deadline = new Date(`${task.date}T12:00:00`);

        if (deadline < today) continue;

        const availableSlots: Suggestion[] = [];

        for (
          let currentDate = new Date(today);
          currentDate <= deadline;
          currentDate = addDays(currentDate, 1)
        ) {
          const currentDateKey = dateKey(currentDate);
          const isToday = currentDateKey === dateKey(now);

          const slots = findAvailableSlots(
            currentDateKey,
            task.durationMinutes,
            busyActivities,
            generatedSuggestions,
            isToday ? earliestTodayMinutes : 7 * 60,
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
          "Não encontrei horários livres futuros antes dos prazos das suas tarefas.",
        );
      }
    } catch (err) {
      console.error("Erro ao planejar tarefas:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível analisar suas tarefas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanning();
  }, [loadPlanning]);

  async function acceptSuggestion(suggestion: Suggestion) {
    // Confere novamente o horário antes de salvá-lo, caso o usuário tenha
    // deixado a página aberta até que a sugestão ficasse no passado.
    const now = new Date();
    const suggestionDate = new Date(
      `${suggestion.date}T${suggestion.start}:00`,
    );

    if (suggestionDate <= now) {
      setError(
        "Esse horário já passou. Atualize o planejamento para receber novas sugestões.",
      );
      return;
    }

    setBusyId(suggestion.task.id);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Você precisa entrar na sua conta.");

      const { data, error: updateError } = await supabase
        .from("tasks")
        .update({
          has_time: true,
          start_time: suggestion.start,
          deadline: suggestion.date,
        })
        .eq("id", suggestion.task.id)
        .eq("user_id", user.id)
        .select("id");

      if (updateError) throw updateError;

      if (!data || data.length === 0) {
        throw new Error(
          "A tarefa não foi atualizada. Verifique as permissões da sua conta.",
        );
      }

      setSuggestions((current) =>
        current.filter((item) => item.task.id !== suggestion.task.id),
      );

      setPlanningTasks((current) =>
        current.filter((task) => task.id !== suggestion.task.id),
      );

      // Recalcula as sugestões considerando a tarefa recém-agendada.
      await loadPlanning();
    } catch (err) {
      console.error("Erro ao aceitar sugestão:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o horário sugerido.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function rejectSuggestion(taskId: string) {
    setSuggestions((current) =>
      current.filter((item) => item.task.id !== taskId),
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-28 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button
          type="button"
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

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
          >
            {error}
            <button
              type="button"
              onClick={() => void loadPlanning()}
              className="ml-2 underline"
            >
              Atualizar planejamento
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
            Analisando suas tarefas e os horários livres...
          </div>
        ) : (
          <>
            {planningTasks.length > 0 && (
              <section className="mt-8">
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

                <div className="mt-4 space-y-3">
                  {planningTasks.map((task) => (
                    <article
                      key={task.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="break-words font-medium">
                            {task.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                            <span>{task.category}</span>
                            <span>{task.durationMinutes} min</span>
                            <span>Prazo: {formatDate(task.date)}</span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-xl px-3 py-2 text-xs ${priorityClass(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {suggestions.length > 0 ? (
              <section className="mt-8 space-y-4">
                {suggestions.map((suggestion) => (
                  <article
                    key={suggestion.task.id}
                    className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Sugestão</p>
                        <h2 className="mt-1 break-words text-lg font-medium">
                          {suggestion.task.title}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-400">
                          {suggestion.task.category} ·{" "}
                          {suggestion.task.durationMinutes} min
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs ${priorityClass(suggestion.task.priority)}`}
                      >
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
                        Prazo informado: {formatDate(suggestion.task.date)}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void acceptSuggestion(suggestion)}
                        className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:opacity-50"
                      >
                        {busyId === suggestion.task.id
                          ? "Salvando..."
                          : "Aceitar"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => rejectSuggestion(suggestion.task.id)}
                        className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Recusar
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="mt-8 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
                <p className="text-zinc-300">
                  {message || "Tudo organizado por enquanto."}
                </p>
                {!loading && (
                  <button
                    type="button"
                    onClick={() => void loadPlanning()}
                    className="mt-4 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    Recalcular horários
                  </button>
                )}
              </section>
            )}
          </>
        )}

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-xs text-zinc-500">Como o Flow está planejando</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>• tarefas de maior prioridade primeiro;</li>
            <li>• somente tarefas ainda sem horário;</li>
            <li>• considera compromissos e tarefas com horário;</li>
            <li>• sem sobrepor atividades existentes;</li>
            <li>• horários entre 07:00 e 22:00;</li>
            <li>• blocos de 15 minutos;</li>
            <li>• não recomenda horários anteriores ao momento atual.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
