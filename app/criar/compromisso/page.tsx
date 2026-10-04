"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  getCategoryColor,
  getSavedActivities,
  saveActivities,
} from "../../lib/activities";

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

const categories = [
  "Pessoal",
  "Estudos",
  "Trabalho",
  "Academia",
  "Escola",
  "Igreja",
  "Robótica",
  "Outro",
];

function getToday() {
  const today = new Date();

  return {
    day: today.getDate(),
    month: today.getMonth(),
    year: today.getFullYear(),
  };
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function CompromissoPage() {
  const router = useRouter();

  const today = getToday();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Pessoal");

  const [day, setDay] = useState(today.day);
  const [month, setMonth] = useState(today.month);
  const [year, setYear] = useState(today.year);

  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(0);

  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(0);

  const currentYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear + index);
  }, [currentYear]);

  const maxDay = daysInMonth(month, year);

  const isBeforeToday =
    year < today.year ||
    (year === today.year && month < today.month) ||
    (year === today.year &&
      month === today.month &&
      day < today.day);

  const isInvalidTime =
    startHour > endHour ||
    (startHour === endHour && startMinute >= endMinute);

  function changeYear(value: number) {
    setYear(value);

    const newMaxDay = daysInMonth(month, value);

    if (day > newMaxDay) {
      setDay(newMaxDay);
    }
  }

  function changeMonth(value: number) {
    setMonth(value);

    const newMaxDay = daysInMonth(value, year);

    if (day > newMaxDay) {
      setDay(newMaxDay);
    }
  }

  function handleSave() {
  if (!title || isBeforeToday || isInvalidTime) {
    return;
  }

  const date = `${year}-${String(month + 1).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;

  const startTime = `${String(startHour).padStart(
    2,
    "0"
  )}:${String(startMinute).padStart(2, "0")}`;

  const endTime = `${String(endHour).padStart(
    2,
    "0"
  )}:${String(endMinute).padStart(2, "0")}`;

  const newActivity = {
    id: Date.now(),
    title: title.trim(),
    date,
    start: startTime,
    end: endTime,
    category,
    color: getCategoryColor(category),
  };

  const currentActivities = getSavedActivities();

  saveActivities([
    ...currentActivities,
    newActivity,
  ]);

  router.push("/agenda");
}

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-8">

        {/* Cabeçalho */}
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
            Novo compromisso
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Adicione algo que tenha um horário definido.
          </p>
        </header>

        {/* Formulário */}
        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          {/* Nome */}
          <div>
            <label className="text-sm font-medium text-zinc-300">
              Nome da atividade
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Academia"
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>

          {/* Categoria */}
          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Categoria
            </label>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Data
            </label>

            <div className="mt-2 grid grid-cols-[0.8fr_1.5fr_1fr] gap-2">

              {/* Dia */}
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
                      year === today.year &&
                      month === today.month
                    ) {
                      return item >= today.day;
                    }

                    return true;
                  })
                  .map((item) => (
                    <option key={item} value={item}>
                      {String(item).padStart(2, "0")}
                    </option>
                  ))}
              </select>

              {/* Mês */}
              <select
                value={month}
                onChange={(event) =>
                  changeMonth(Number(event.target.value))
                }
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {months.map((item, index) => {
                  const disabled =
                    year === today.year &&
                    index < today.month;

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

              {/* Ano */}
              <select
                value={year}
                onChange={(event) =>
                  changeYear(Number(event.target.value))
                }
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {availableYears.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {isBeforeToday && (
              <p className="mt-2 text-xs text-rose-400">
                A data não pode ser anterior a hoje.
              </p>
            )}
          </div>

          {/* Horários */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">

            {/* Início */}
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Início
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">

                <div>
                  <select
                    value={startHour}
                    onChange={(event) =>
                      setStartHour(Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from(
                      { length: 24 },
                      (_, index) => index
                    ).map((hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-center text-[11px] text-zinc-600">
                    Hora
                  </p>
                </div>

                <div>
                  <select
                    value={startMinute}
                    onChange={(event) =>
                      setStartMinute(Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from(
                      { length: 60 },
                      (_, index) => index
                    ).map((minute) => (
                      <option key={minute} value={minute}>
                        {String(minute).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-center text-[11px] text-zinc-600">
                    Minuto
                  </p>
                </div>

              </div>
            </div>

            {/* Término */}
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Término
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">

                <div>
                  <select
                    value={endHour}
                    onChange={(event) =>
                      setEndHour(Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from(
                      { length: 24 },
                      (_, index) => index
                    ).map((hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-center text-[11px] text-zinc-600">
                    Hora
                  </p>
                </div>

                <div>
                  <select
                    value={endMinute}
                    onChange={(event) =>
                      setEndMinute(Number(event.target.value))
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from(
                      { length: 60 },
                      (_, index) => index
                    ).map((minute) => (
                      <option key={minute} value={minute}>
                        {String(minute).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-center text-[11px] text-zinc-600">
                    Minuto
                  </p>
                </div>

              </div>
            </div>
          </div>

          {isInvalidTime && (
            <p className="mt-3 text-xs text-rose-400">
              O horário de término deve ser posterior ao horário de início.
            </p>
          )}

          {/* Botão */}
          <button
            onClick={handleSave}
            disabled={
              !title ||
              isBeforeToday ||
              isInvalidTime
            }
            className="mt-8 w-full rounded-2xl bg-zinc-100 px-4 py-3 font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Salvar compromisso
          </button>
        </section>
      </div>
    </main>
  );
}