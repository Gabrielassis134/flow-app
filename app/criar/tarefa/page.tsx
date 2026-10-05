"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Priority = "Alta" | "Média" | "Baixa";

const categories = [
  "Estudos",
  "Escola",
  "Trabalho",
  "Robótica",
  "Pessoal",
  "Igreja",
  "Outro",
];

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function NovaTarefaPage() {
  const router = useRouter();

  const today = new Date();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [category, setCategory] = useState("Estudos");
  const [priority, setPriority] = useState<Priority>("Média");

  const [day, setDay] = useState(today.getDate());
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);

  const [hasTime, setHasTime] = useState(false);

  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(0);

  const currentYear = today.getFullYear();

  const maxDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const isBeforeToday =
    year < currentYear ||
    (year === currentYear &&
      month < today.getMonth()) ||
    (year === currentYear &&
      month === today.getMonth() &&
      day < today.getDate());

  function changeMonth(value: number) {
    setMonth(value);

    const newMaxDay = new Date(
      year,
      value + 1,
      0
    ).getDate();

    if (day > newMaxDay) {
      setDay(newMaxDay);
    }
  }

  function changeYear(value: number) {
    setYear(value);

    const newMaxDay = new Date(
      value,
      month + 1,
      0
    ).getDate();

    if (day > newMaxDay) {
      setDay(newMaxDay);
    }
  }

  function handleSave() {
    if (!title.trim()) {
      return;
    }

    if (isBeforeToday) {
      return;
    }

    if (
      durationHours === 0 &&
      durationMinutes === 0
    ) {
      return;
    }

    const date =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const startTime = hasTime
      ? `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`
      : null;

    const newTask = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      date,
      durationMinutes:
        durationHours * 60 + durationMinutes,
      duration:
        `${durationHours}h ${String(durationMinutes).padStart(2, "0")}min`,
      priority,
      category,
      hasTime,
      startTime,
      completed: false,
    };

    const saved =
      localStorage.getItem("flow-tasks");

    let currentTasks = [];

    if (saved) {
      try {
        currentTasks = JSON.parse(saved);
      } catch {
        currentTasks = [];
      }
    }

    localStorage.setItem(
      "flow-tasks",
      JSON.stringify([
        ...currentTasks,
        newTask,
      ])
    );

    router.push("/tarefas");
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-8">

        {/* CABEÇALHO */}

        <header>
          <button
            onClick={() => router.back()}
            className="text-sm text-zinc-500 transition hover:text-zinc-200"
          >
            ← Voltar
          </button>

          <p className="mt-8 text-sm text-zinc-500">
            Nova criação
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Nova tarefa
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Organize algo que precisa ser feito.
          </p>
        </header>

        {/* FORMULÁRIO */}

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          {/* NOME */}

          <div>
            <label className="text-sm font-medium text-zinc-300">
              Nome da tarefa
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Ex.: Estudar Física"
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>

          {/* DESCRIÇÃO */}

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Descrição

              <span className="ml-2 text-xs font-normal text-zinc-600">
                opcional
              </span>
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Ex.: Revisar as leis de Newton"
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>

          {/* CATEGORIA */}

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Categoria
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
            >
              {categories.map((item) => (
                <option key={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* PRIORIDADE */}

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Prioridade
            </label>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                ["Alta", "Média", "Baixa"] as Priority[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setPriority(item)
                  }
                  className={`rounded-2xl border px-3 py-3 text-sm transition ${
                    priority === item
                      ? item === "Alta"
                        ? "border-rose-400 bg-rose-400/10 text-rose-300"
                        : item === "Média"
                        ? "border-amber-400 bg-amber-400/10 text-amber-300"
                        : "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* PRAZO */}

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Prazo
            </label>

            <div className="mt-2 grid grid-cols-[0.8fr_1.5fr_1fr] gap-2">

              <select
                value={day}
                onChange={(event) =>
                  setDay(Number(event.target.value))
                }
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {Array.from(
                  { length: maxDay },
                  (_, index) => index + 1
                )
                  .filter((item) => {
                    if (
                      year === currentYear &&
                      month === today.getMonth()
                    ) {
                      return item >= today.getDate();
                    }

                    return true;
                  })
                  .map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {String(item).padStart(2, "0")}
                    </option>
                  ))}
              </select>

              <select
                value={month}
                onChange={(event) =>
                  changeMonth(
                    Number(event.target.value)
                  )
                }
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {months.map((item, index) => {
                  const disabled =
                    year === currentYear &&
                    index < today.getMonth();

                  return (
                    <option
                      key={item}
                      value={index}
                      disabled={disabled}
                    >
                      {item}
                    </option>
                  );
                })}
              </select>

              <select
                value={year}
                onChange={(event) =>
                  changeYear(
                    Number(event.target.value)
                  )
                }
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {Array.from(
                  { length: 6 },
                  (_, index) =>
                    currentYear + index
                ).map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

            </div>

            {isBeforeToday && (
              <p className="mt-2 text-xs text-rose-400">
                O prazo não pode ser anterior a hoje.
              </p>
            )}
          </div>

          {/* DURAÇÃO */}

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Duração estimada
            </label>

            <div className="mt-2 grid grid-cols-2 gap-3">

              <div>
                <select
                  value={durationHours}
                  onChange={(event) =>
                    setDurationHours(
                      Number(event.target.value)
                    )
                  }
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                >
                  {Array.from(
                    { length: 13 },
                    (_, index) => index
                  ).map((hour) => (
                    <option
                      key={hour}
                      value={hour}
                    >
                      {hour}h
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-center text-[11px] text-zinc-600">
                  Horas
                </p>
              </div>

              <div>
                <select
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(
                      Number(event.target.value)
                    )
                  }
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                >
                  {[0, 15, 30, 45].map(
                    (minute) => (
                      <option
                        key={minute}
                        value={minute}
                      >
                        {String(minute).padStart(
                          2,
                          "0"
                        )}{" "}
                        min
                      </option>
                    )
                  )}
                </select>

                <p className="mt-1 text-center text-[11px] text-zinc-600">
                  Minutos
                </p>
              </div>

            </div>
          </div>

          {/* HORÁRIO */}

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">

            <button
              type="button"
              onClick={() =>
                setHasTime(!hasTime)
              }
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-medium">
                  Definir horário
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {hasTime
                    ? "A tarefa terá um horário específico."
                    : "O Flow poderá encontrar um horário livre depois."}
                </p>
              </div>

              <div
                className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
                  hasTime
                    ? "bg-sky-400"
                    : "bg-zinc-800"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full transition ${
                    hasTime
                      ? "translate-x-5 bg-zinc-950"
                      : "bg-zinc-500"
                  }`}
                />
              </div>
            </button>

            {hasTime && (
              <div className="mt-4 grid grid-cols-2 gap-3">

                <div>
                  <label className="text-xs text-zinc-500">
                    Hora
                  </label>

                  <select
                    value={startHour}
                    onChange={(event) =>
                      setStartHour(
                        Number(event.target.value)
                      )
                    }
                    className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from(
                      { length: 24 },
                      (_, index) => index
                    ).map((hour) => (
                      <option
                        key={hour}
                        value={hour}
                      >
                        {String(hour).padStart(
                          2,
                          "0"
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-500">
                    Minuto
                  </label>

                  <select
                    value={startMinute}
                    onChange={(event) =>
                      setStartMinute(
                        Number(event.target.value)
                      )
                    }
                    className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {[0, 15, 30, 45].map(
                      (minute) => (
                        <option
                          key={minute}
                          value={minute}
                        >
                          {String(minute).padStart(
                            2,
                            "0"
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

              </div>
            )}

          </div>

          {/* SALVAR */}

          <button
            type="button"
            onClick={handleSave}
            disabled={
              !title.trim() ||
              isBeforeToday ||
              (durationHours === 0 &&
                durationMinutes === 0)
            }
            className="mt-8 w-full rounded-2xl bg-zinc-100 px-4 py-3 font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Salvar tarefa
          </button>

        </section>
      </div>
    </main>
  );
}