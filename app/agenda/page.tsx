
"use client";

import { useState } from "react";
import Link from "next/link";

type Activity = {
  id: number;
  title: string;
  date: string;
  start: string;
  end: string;
  category: string;
  color: string;
};

const initialActivities: Activity[] = [
  {
    id: 1,
    title: "Aula",
    date: "2026-10-05",
    start: "07:45",
    end: "17:15",
    category: "Escola",
    color: "border-l-sky-400",
  },
  {
    id: 2,
    title: "Academia",
    date: "2026-10-06",
    start: "09:00",
    end: "10:00",
    category: "Pessoal",
    color: "border-l-emerald-400",
  },
  {
    id: 3,
    title: "Aula",
    date: "2026-10-06",
    start: "13:15",
    end: "17:15",
    category: "Escola",
    color: "border-l-sky-400",
  },
  {
    id: 4,
    title: "Curso de inglês",
    date: "2026-10-06",
    start: "19:00",
    end: "21:00",
    category: "Estudos",
    color: "border-l-violet-400",
  },
  {
    id: 5,
    title: "Aula",
    date: "2026-10-07",
    start: "07:45",
    end: "17:15",
    category: "Escola",
    color: "border-l-sky-400",
  },
  {
    id: 6,
    title: "Academia",
    date: "2026-10-08",
    start: "09:00",
    end: "10:00",
    category: "Pessoal",
    color: "border-l-emerald-400",
  },
  {
    id: 7,
    title: "Culto",
    date: "2026-10-08",
    start: "19:00",
    end: "22:00",
    category: "Igreja",
    color: "border-l-amber-400",
  },
  {
    id: 8,
    title: "Ensaio de baixo",
    date: "2026-10-09",
    start: "11:00",
    end: "12:00",
    category: "Música",
    color: "border-l-pink-400",
  },
  {
    id: 9,
    title: "Ensaio da banda",
    date: "2026-10-09",
    start: "19:00",
    end: "21:00",
    category: "Música",
    color: "border-l-pink-400",
  },
  {
    id: 10,
    title: "Escola bíblica",
    date: "2026-10-11",
    start: "09:00",
    end: "10:30",
    category: "Igreja",
    color: "border-l-amber-400",
  },
  {
    id: 11,
    title: "Ensaio na igreja",
    date: "2026-10-11",
    start: "17:00",
    end: "18:30",
    category: "Música",
    color: "border-l-pink-400",
  },
  {
    id: 12,
    title: "Culto",
    date: "2026-10-11",
    start: "19:00",
    end: "21:30",
    category: "Igreja",
    color: "border-l-amber-400",
  },
];

const weekdays = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const shortDays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

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

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date(2026, 9, 4)
  );

  const [view, setView] = useState<"Semana" | "Dia" | "Mês">("Semana");

  const [activities, setActivities] =
    useState<Activity[]>(initialActivities);

  const [showForm, setShowForm] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<Activity | null>(null);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("15:00");
  const [category, setCategory] = useState("Pessoal");

  const weekStart = getWeekStart(selectedDate);

  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index)
  );

  const selectedActivities = activities
    .filter((activity) => activity.date === dateKey(selectedDate))
    .sort((a, b) => a.start.localeCompare(b.start));

  function moveDate(direction: number) {
    if (view === "Dia") {
      setSelectedDate((date) => addDays(date, direction));
    } else if (view === "Semana") {
      setSelectedDate((date) => addDays(date, direction * 7));
    } else {
      setSelectedDate((date) => {
        const next = new Date(date);
        next.setMonth(next.getMonth() + direction);
        return next;
      });
    }
  }

  function createActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || start >= end) return;

    const newActivity: Activity = {
      id: Date.now(),
      title: title.trim(),
      date: dateKey(selectedDate),
      start,
      end,
      category,
      color:
        category === "Escola"
          ? "border-l-sky-400"
          : category === "Estudos"
          ? "border-l-violet-400"
          : category === "Igreja"
          ? "border-l-amber-400"
          : category === "Música"
          ? "border-l-pink-400"
          : "border-l-emerald-400",
    };

    setActivities((current) => [...current, newActivity]);
    setTitle("");
    setShowForm(false);
  }

  const heading =
    view === "Mês"
      ? selectedDate.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })
      : view === "Dia"
      ? formatDate(selectedDate)
      : `${weekDates[0].toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "short",
        })} – ${weekDates[6].toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;

  return (
    <main className="min-h-screen bg-zinc-950 pb-28 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              ← Voltar ao início
            </Link>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Minha agenda
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Seus compromissos, no seu ritmo.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300"
          >
            + Nova atividade
          </button>
        </header>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-zinc-400">Período selecionado</p>
              <h2 className="mt-1 text-xl font-semibold capitalize">
                {heading}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => moveDate(-1)}
                aria-label="Período anterior"
                className="rounded-xl border border-zinc-700 px-4 py-2 transition hover:bg-zinc-800"
              >
                ←
              </button>

              <button
                onClick={() => setSelectedDate(new Date(2026, 9, 4))}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
              >
                Hoje
              </button>

              <button
                onClick={() => moveDate(1)}
                aria-label="Próximo período"
                className="rounded-xl border border-zinc-700 px-4 py-2 transition hover:bg-zinc-800"
              >
                →
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-950 p-1">
            {(["Dia", "Semana", "Mês"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setView(option)}
                className={`rounded-xl px-3 py-2.5 text-sm transition ${
                  view === option
                    ? "bg-zinc-800 font-medium text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        {view === "Semana" && (
          <section className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-3">
            {weekDates.map((date, index) => {
              const active = dateKey(date) === dateKey(selectedDate);
              const count = activities.filter(
                (activity) => activity.date === dateKey(date)
              ).length;

              return (
                <button
                  key={dateKey(date)}
                  onClick={() => setSelectedDate(date)}
                  className={`min-w-0 rounded-2xl border p-2 text-center transition sm:p-4 ${
                    active
                      ? "border-sky-400 bg-sky-400/10"
                      : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                  }`}
                >
                  <span className="text-[10px] text-zinc-500 sm:text-xs">
                    {shortDays[index]}
                  </span>

                  <span
                    className={`mt-2 block text-lg font-semibold sm:text-xl ${
                      active ? "text-sky-300" : "text-zinc-200"
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  <span className="mx-auto mt-2 flex h-5 items-center justify-center gap-0.5">
                    {Array.from(
                      { length: Math.min(count, 3) },
                      (_, dot) => (
                        <span
                          key={dot}
                          className={`h-1 w-1 rounded-full ${
                            active ? "bg-sky-300" : "bg-zinc-500"
                          }`}
                        />
                      )
                    )}
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {view === "Mês" && (
          <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-1 text-center">
              {shortDays.map((day) => (
                <div
                  key={day}
                  className="py-2 text-[10px] text-zinc-500 sm:text-xs"
                >
                  {day}
                </div>
              ))}

              {Array.from(
                {
                  length: new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth() + 1,
                    0
                  ).getDate(),
                },
                (_, index) => {
                  const date = new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    index + 1
                  );

                  const count = activities.filter(
                    (activity) => activity.date === dateKey(date)
                  ).length;

                  const active =
                    dateKey(date) === dateKey(selectedDate);

                  return (
                    <button
                      key={dateKey(date)}
                      onClick={() => {
                        setSelectedDate(date);
                        setView("Dia");
                      }}
                      className={`min-h-12 rounded-xl p-1 text-sm transition sm:min-h-16 ${
                        active
                          ? "bg-sky-400/15 text-sky-300"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {date.getDate()}
                      {count > 0 && (
                        <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-sky-400" />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">
                {weekdays[selectedDate.getDay()]}
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {selectedDate.toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                })}
              </h2>
            </div>

            <span className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-400">
              {selectedActivities.length}{" "}
              {selectedActivities.length === 1
                ? "atividade"
                : "atividades"}
            </span>
          </div>

          <div className="mt-6">
            {selectedActivities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-10 text-center">
                <p className="text-zinc-300">
                  Nenhuma atividade neste dia.
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Que tal aproveitar esse tempo livre?
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-sm text-sky-300 hover:text-sky-200"
                >
                  + Adicionar atividade
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedActivities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className={`flex w-full gap-3 rounded-2xl border border-zinc-800 border-l-4 ${activity.color} bg-zinc-900 p-4 text-left transition hover:bg-zinc-800/80 sm:gap-5`}
                  >
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-medium">
                        {activity.start}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {activity.end}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {activity.title}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {activity.category}
                      </p>
                    </div>

                    <span className="self-center text-zinc-500">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="font-medium">Categorias</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
            {[
              ["bg-sky-400", "Escola"],
              ["bg-emerald-400", "Pessoal"],
              ["bg-violet-400", "Estudos"],
              ["bg-amber-400", "Igreja"],
              ["bg-pink-400", "Música"],
            ].map(([color, label]) => (
              <span key={label} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={createActivity}
            className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Nova atividade</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-1 text-zinc-400 hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-sm text-zinc-400">
              {formatDate(selectedDate)}
            </p>

            <label className="mt-6 block text-sm text-zinc-300">
              Nome da atividade
              <input
                autoFocus
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Estudar matemática"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-400"
              />
            </label>

            <label className="mt-4 block text-sm text-zinc-300">
              Categoria
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-sky-400"
              >
                <option>Escola</option>
                <option>Estudos</option>
                <option>Pessoal</option>
                <option>Igreja</option>
                <option>Música</option>
              </select>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm text-zinc-300">
                Início
                <input
                  required
                  type="time"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 outline-none focus:border-sky-400"
                />
              </label>

              <label className="text-sm text-zinc-300">
                Término
                <input
                  required
                  type="time"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 outline-none focus:border-sky-400"
                />
              </label>
            </div>

            {start >= end && (
              <p className="mt-2 text-sm text-rose-300">
                O término precisa ser depois do início.
              </p>
            )}

            <button
              type="submit"
              disabled={!title.trim() || start >= end}
              className="mt-6 w-full rounded-xl bg-sky-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Salvar atividade
            </button>
          </form>
        </div>
      )}

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-400">
                  {selectedActivity.category}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedActivity.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="rounded-lg px-3 py-1 text-zinc-400 hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400">Data</p>
              <p className="mt-1">{formatDate(
                new Date(`${selectedActivity.date}T12:00:00`)
              )}</p>

              <p className="mt-4 text-sm text-zinc-400">Horário</p>
              <p className="mt-1">
                {selectedActivity.start} – {selectedActivity.end}
              </p>
            </div>

            <button
              onClick={() => {
                setActivities((current) =>
                  current.filter(
                    (activity) => activity.id !== selectedActivity.id
                  )
                );
                setSelectedActivity(null);
              }}
              className="mt-5 w-full rounded-xl border border-rose-900/70 px-4 py-3 text-sm text-rose-300 transition hover:bg-rose-950/40"
            >
              Excluir atividade
            </button>
          </div>
        </div>
      )}
    </main>
  );
}