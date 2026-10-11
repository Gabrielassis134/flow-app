"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTaskFromDatabase,
  getTasks,
  setTaskCompleted,
  type Task,
} from "../lib/tasks";

type Filter = "Todas" | "Hoje" | "Próximas" | "Atrasadas" | "Concluídas";

const FILTERS: Filter[] = [
  "Todas",
  "Hoje",
  "Próximas",
  "Atrasadas",
  "Concluídas",
];

function getToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(date: string) {
  if (!date) return "Sem data definida";

  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;

  return `${day}/${month}/${year}`;
}

function priorityClass(priority: Task["priority"]) {
  switch (priority) {
    case "Alta":
      return "bg-rose-400/10 text-rose-300";
    case "Média":
      return "bg-amber-400/10 text-amber-300";
    default:
      return "bg-emerald-400/10 text-emerald-300";
  }
}

export default function TarefasPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setTasks(await getTasks());
    } catch (err) {
      console.error("Erro ao carregar tarefas:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar suas tarefas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const today = getToday();

  const filteredTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (!a.date && !b.date) return a.title.localeCompare(b.title);
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

    switch (filter) {
      case "Hoje":
        return sorted.filter((task) => task.date === today && !task.completed);
      case "Próximas":
        return sorted.filter((task) => task.date > today && !task.completed);
      case "Atrasadas":
        return sorted.filter((task) =>
          Boolean(task.date && task.date < today && !task.completed),
        );
      case "Concluídas":
        return sorted.filter((task) => task.completed);
      default:
        return sorted;
    }
  }, [tasks, filter, today]);

  async function handleToggle(task: Task) {
    const nextCompleted = !task.completed;
    setBusyId(task.id);
    setError("");

    try {
      await setTaskCompleted(task.id, nextCompleted);

      const updatedTask = { ...task, completed: nextCompleted };

      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updatedTask : item)),
      );
      setSelectedTask((current) =>
        current?.id === task.id ? updatedTask : current,
      );
    } catch (err) {
      console.error("Erro ao atualizar tarefa:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a tarefa.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!selectedTask || busyId) return;

    const taskToDelete = selectedTask;
    setBusyId(taskToDelete.id);
    setError("");

    try {
      await deleteTaskFromDatabase(taskToDelete.id);

      setTasks((current) =>
        current.filter((task) => task.id !== taskToDelete.id),
      );
      setSelectedTask(null);
      setConfirmDelete(false);
    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a tarefa.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 pb-32 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500">Seu planejamento</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Minhas tarefas
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Organize suas prioridades e acompanhe seu progresso.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/criar/tarefa")}
              className="shrink-0 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white"
            >
              + Nova tarefa
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.push("/planejamento")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            <span aria-hidden="true">✦</span>
            Planejamento
          </button>
        </header>

        <section className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-xs text-zinc-500">Total</p>
            <p className="mt-2 text-2xl font-semibold">{tasks.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-xs text-zinc-500">Pendentes</p>
            <p className="mt-2 text-2xl font-semibold">
              {tasks.filter((task) => !task.completed).length}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-xs text-zinc-500">Concluídas</p>
            <p className="mt-2 text-2xl font-semibold">
              {tasks.filter((task) => task.completed).length}
            </p>
          </div>
        </section>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                filter === item
                  ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="mt-2 underline"
            >
              Tentar carregar novamente
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-400">
            Carregando tarefas do banco de dados...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
            <h2 className="text-lg font-medium">Nenhuma tarefa encontrada</h2>
            <p className="mt-2 text-sm text-zinc-500">
              {filter === "Todas"
                ? "Crie uma tarefa para começar a organizar seu dia."
                : `Você não tem tarefas na categoria "${filter}".`}
            </p>
            {filter === "Todas" && (
              <button
                type="button"
                onClick={() => router.push("/criar/tarefa")}
                className="mt-5 rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950"
              >
                Criar tarefa
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <article
                key={task.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => void handleToggle(task)}
                    aria-label={
                      task.completed
                        ? `Reabrir tarefa ${task.title}`
                        : `Concluir tarefa ${task.title}`
                    }
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm transition disabled:opacity-50 ${
                      task.completed
                        ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                        : "border-zinc-600 text-transparent hover:border-zinc-300"
                    }`}
                  >
                    ✓
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setConfirmDelete(false);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <h2
                      className={`break-words font-medium ${
                        task.completed
                          ? "text-zinc-500 line-through"
                          : "text-zinc-100"
                      }`}
                    >
                      {task.title}
                    </h2>

                    {task.description && (
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-zinc-500">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
                        {formatDate(task.date)}
                      </span>
                      {task.hasTime && task.startTime && (
                        <span className="rounded-full bg-sky-400/10 px-3 py-1 text-sky-300">
                          {task.startTime}
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
                        {task.durationMinutes} min
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${priorityClass(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
                        {task.category}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setConfirmDelete(false);
                    }}
                    aria-label={`Ver detalhes de ${task.title}`}
                    className="rounded-lg px-2 py-1 text-xl text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    ⋯
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busyId) {
              setSelectedTask(null);
              setConfirmDelete(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-dialog-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Detalhes da tarefa
                </p>
                <h2
                  id="task-dialog-title"
                  className="mt-2 break-words text-xl font-semibold"
                >
                  {selectedTask.title}
                </h2>
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => {
                  setSelectedTask(null);
                  setConfirmDelete(false);
                }}
                aria-label="Fechar detalhes"
                className="rounded-full px-3 py-1 text-xl text-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {selectedTask.description && (
              <div className="mb-4">
                <p className="text-sm text-zinc-500">Descrição</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-200">
                  {selectedTask.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500">Data</p>
                <p className="mt-1 text-sm font-medium">
                  {formatDate(selectedTask.date)}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500">Duração</p>
                <p className="mt-1 text-sm font-medium">
                  {selectedTask.durationMinutes} minutos
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500">Horário</p>
                <p className="mt-1 text-sm font-medium">
                  {selectedTask.hasTime && selectedTask.startTime
                    ? selectedTask.startTime
                    : "Sem horário definido"}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500">Prioridade</p>
                <p className="mt-1 text-sm font-medium">
                  {selectedTask.priority}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500">Categoria</p>
                <p className="mt-1 text-sm font-medium">
                  {selectedTask.category || "Sem categoria"}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500">Status</p>
                <p className="mt-1 text-sm font-medium">
                  {selectedTask.completed ? "Concluída" : "Pendente"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={busyId === selectedTask.id}
                onClick={() => void handleToggle(selectedTask)}
                className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              >
                {busyId === selectedTask.id
                  ? "Salvando..."
                  : selectedTask.completed
                    ? "Marcar como pendente"
                    : "Marcar como concluída"}
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  disabled={busyId === selectedTask.id}
                  onClick={() => setConfirmDelete(true)}
                  className="w-full rounded-2xl border border-rose-500/30 px-4 py-3 text-sm font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  Excluir tarefa
                </button>
              ) : (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <p className="text-sm font-medium text-rose-200">
                    Deseja realmente excluir esta tarefa?
                  </p>
                  <p className="mt-1 text-xs text-rose-300/80">
                    Ela será removida do banco de dados e não poderá ser
                    recuperada por esta página.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === selectedTask.id}
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-xl border border-zinc-700 px-3 py-2 text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === selectedTask.id}
                      onClick={() => void handleDelete()}
                      className="flex-1 rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busyId === selectedTask.id
                        ? "Excluindo..."
                        : "Confirmar exclusão"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
