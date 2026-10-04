"use client";

import { useMemo, useState } from "react";

type Priority = "Alta" | "Média" | "Baixa";
type Filter = "Todas" | "Hoje" | "Próximas" | "Atrasadas" | "Concluídas";

type Task = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  duration: string;
  priority: Priority;
  category: string;
  completed: boolean;
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Estudar Física",
    description: "Revisar o conteúdo da próxima avaliação.",
    deadline: "Hoje",
    duration: "1h30",
    priority: "Alta",
    category: "Estudos",
    completed: false,
  },
  {
    id: 2,
    title: "Projeto de robótica",
    description: "Continuar a montagem e testar os componentes.",
    deadline: "Sexta-feira",
    duration: "2h",
    priority: "Média",
    category: "Robótica",
    completed: false,
  },
  {
    id: 3,
    title: "Preparar material da aula",
    description: "Organizar o material para a equipe.",
    deadline: "Amanhã",
    duration: "45 min",
    priority: "Média",
    category: "Robótica",
    completed: false,
  },
  {
    id: 4,
    title: "Ler capítulo do livro",
    description: "Leitura do próximo capítulo.",
    deadline: "Domingo",
    duration: "40 min",
    priority: "Baixa",
    category: "Pessoal",
    completed: false,
  },
  {
    id: 5,
    title: "Revisar anotações",
    description: "Organizar as anotações da semana.",
    deadline: "Ontem",
    duration: "30 min",
    priority: "Alta",
    category: "Estudos",
    completed: true,
  },
];

const priorityStyles = {
  Alta: {
    badge: "bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
    border: "border-l-rose-400",
  },
  Média: {
    badge: "bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
    border: "border-l-amber-400",
  },
  Baixa: {
    badge: "bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
    border: "border-l-emerald-400",
  },
};

const filters: Filter[] = [
  "Todas",
  "Hoje",
  "Próximas",
  "Atrasadas",
  "Concluídas",
];

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<Filter>("Todas");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "Todas") return true;

      if (filter === "Hoje") {
        return task.deadline === "Hoje" && !task.completed;
      }

      if (filter === "Próximas") {
        return (
          ["Amanhã", "Sexta-feira", "Domingo"].includes(task.deadline) &&
          !task.completed
        );
      }

      if (filter === "Atrasadas") {
        return task.deadline === "Ontem" && !task.completed;
      }

      if (filter === "Concluídas") {
        return task.completed;
      }

      return true;
    });
  }, [tasks, filter]);

  const pendingCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.filter((task) => task.completed).length;

  function toggleTask(id: number) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    );

    setSelectedTask((current) => {
      if (!current || current.id !== id) return current;

      return {
        ...current,
        completed: !current.completed,
      };
    });
  }

  function deleteTask(id: number) {
    setTasks((current) =>
      current.filter((task) => task.id !== id)
    );

    setSelectedTask(null);
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* Cabeçalho */}
        <header>
          <p className="text-sm text-zinc-500">
            Sua organização
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Tarefas
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Tudo que precisa ser feito, sem perder o controle.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <p className="text-xs text-zinc-500">
                  Pendentes
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {pendingCount}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <p className="text-xs text-zinc-500">
                  Concluídas
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {completedCount}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <section className="mt-8 overflow-x-auto">
          <div className="flex min-w-max gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  filter === item
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* Lista */}
        <section className="mt-6">
          {filteredTasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
              <p className="text-lg font-medium">
                Nenhuma tarefa aqui.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Quando houver algo para mostrar, aparecerá nesta lista.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const priority = priorityStyles[task.priority];

                return (
                  <div
                    key={task.id}
                    className={`group flex items-center gap-4 rounded-2xl border border-zinc-800 border-l-4 ${priority.border} bg-zinc-900/70 p-4 transition hover:bg-zinc-900`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={
                        task.completed
                          ? "Marcar como pendente"
                          : "Concluir tarefa"
                      }
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                        task.completed
                          ? "border-zinc-500 bg-zinc-100 text-zinc-950"
                          : "border-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      {task.completed && (
                        <span className="text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </button>

                    {/* Conteúdo */}
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          className={`font-medium ${
                            task.completed
                              ? "text-zinc-500 line-through"
                              : "text-zinc-100"
                          }`}
                        >
                          {task.title}
                        </h2>

                        <span
                          className={`rounded-full px-2 py-1 text-[11px] ${priority.badge}`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>
                          Prazo: {task.deadline}
                        </span>

                        <span>
                          {task.duration}
                        </span>

                        <span>
                          {task.category}
                        </span>
                      </div>
                    </button>

                    <span className="hidden text-zinc-600 transition group-hover:text-zinc-400 sm:block">
                      ›
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Resumo */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="text-sm text-zinc-400">
                Alta prioridade
              </span>
            </div>

            <p className="mt-3 text-2xl font-semibold">
              {
                tasks.filter(
                  (task) =>
                    task.priority === "Alta" &&
                    !task.completed
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="text-sm text-zinc-400">
                Média prioridade
              </span>
            </div>

            <p className="mt-3 text-2xl font-semibold">
              {
                tasks.filter(
                  (task) =>
                    task.priority === "Média" &&
                    !task.completed
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm text-zinc-400">
                Baixa prioridade
              </span>
            </div>

            <p className="mt-3 text-2xl font-semibold">
              {
                tasks.filter(
                  (task) =>
                    task.priority === "Baixa" &&
                    !task.completed
                ).length
              }
            </p>
          </div>
        </section>
      </div>

      {/* Detalhes da tarefa */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">
                  {selectedTask.category}
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedTask.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-xl px-3 py-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-zinc-400">
              {selectedTask.description}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  Prazo
                </p>

                <p className="mt-1 text-sm">
                  {selectedTask.deadline}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  Duração
                </p>

                <p className="mt-1 text-sm">
                  {selectedTask.duration}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  Prioridade
                </p>

                <p className="mt-1 text-sm">
                  {selectedTask.priority}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-4">
                <p className="text-xs text-zinc-500">
                  Status
                </p>

                <p className="mt-1 text-sm">
                  {selectedTask.completed
                    ? "Concluída"
                    : "Pendente"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => toggleTask(selectedTask.id)}
                className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white"
              >
                {selectedTask.completed
                  ? "Marcar como pendente"
                  : "Concluir tarefa"}
              </button>

              <button
                onClick={() => deleteTask(selectedTask.id)}
                className="rounded-xl border border-rose-900/70 px-4 py-3 text-sm text-rose-300 transition hover:bg-rose-950/40"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}