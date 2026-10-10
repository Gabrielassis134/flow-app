"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  getCategoryColor,
  getSavedActivities,
  saveActivities,
} from "../../lib/activities";
import { createSupabaseActivity } from "../../lib/supabase-activities";

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

  const [conflict, setConflict] = useState<{
    title: string;
    start: string;
    end: string;
  } | null>(null);

  const [recurrence, setRecurrence] = useState<
    "none" | "weekly" | "weekdays" | "custom"
  >("none");

  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);

  const [recurrenceEnd, setRecurrenceEnd] = useState<"never" | "date">("never");

  const [recurrenceEndDay, setRecurrenceEndDay] = useState(today.day);

  const [recurrenceEndMonth, setRecurrenceEndMonth] = useState(today.month);

  const [recurrenceEndYear, setRecurrenceEndYear] = useState(today.year);

  const currentYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear + index);
  }, [currentYear]);

  const maxDay = daysInMonth(month, year);

  const isBeforeToday =
    year < today.year ||
    (year === today.year && month < today.month) ||
    (year === today.year && month === today.month && day < today.day);

  const isInvalidTime =
    startHour > endHour || (startHour === endHour && startMinute >= endMinute);

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

  function timeToMinutes(time: string) {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
  }

  function overlaps(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ) {
    const startAMinutes = timeToMinutes(startA);
    const endAMinutes = timeToMinutes(endA);

    const startBMinutes = timeToMinutes(startB);
    const endBMinutes = timeToMinutes(endB);

    return startAMinutes < endBMinutes && endAMinutes > startBMinutes;
  }

  function findConflict(date: string, start: string, end: string) {
    const activities = getSavedActivities();

    const activityConflict = activities.find((activity) => {
      const selectedDate = new Date(`${date}T00:00:00`);
      const activityDate = new Date(`${activity.date}T00:00:00`);

      if (selectedDate < activityDate) {
        return false;
      }

      if (activity.recurrenceEnd === "date" && activity.recurrenceEndDate) {
        const recurrenceEndDate = new Date(
          `${activity.recurrenceEndDate}T00:00:00`,
        );

        if (selectedDate > recurrenceEndDate) {
          return false;
        }
      }

      let occursOnDate = false;

      if (!activity.recurrence || activity.recurrence === "none") {
        occursOnDate = activity.date === date;
      }

      if (activity.recurrence === "weekly") {
        occursOnDate = selectedDate.getDay() === activityDate.getDay();
      }

      if (activity.recurrence === "weekdays") {
        const dayOfWeek = selectedDate.getDay();

        occursOnDate = dayOfWeek >= 1 && dayOfWeek <= 5;
      }

      if (activity.recurrence === "custom") {
        occursOnDate =
          activity.recurrenceDays?.includes(selectedDate.getDay()) ?? false;
      }

      if (!occursOnDate) {
        return false;
      }

      return overlaps(start, end, activity.start, activity.end);
    });

    if (activityConflict) {
      return {
        title: activityConflict.title,
        start: activityConflict.start,
        end: activityConflict.end,
      };
    }

    const savedTasks = localStorage.getItem("flow-tasks");

    if (savedTasks) {
      try {
        const tasks = JSON.parse(savedTasks);

        if (Array.isArray(tasks)) {
          const taskConflict = tasks.find((task) => {
            if (
              task.completed ||
              !task.hasTime ||
              !task.startTime ||
              task.date !== date
            ) {
              return false;
            }

            const taskStart = task.startTime;

            const taskDuration = Number(task.durationMinutes) || 0;

            const taskStartMinutes = timeToMinutes(taskStart);

            const taskEndMinutes = taskStartMinutes + taskDuration;

            const taskEnd = `${String(Math.floor(taskEndMinutes / 60)).padStart(
              2,
              "0",
            )}:${String(taskEndMinutes % 60).padStart(2, "0")}`;

            return overlaps(start, end, taskStart, taskEnd);
          });

          if (taskConflict) {
            return {
              title: taskConflict.title,
              start: taskConflict.startTime,
              end: (() => {
                const startMinutes = timeToMinutes(taskConflict.startTime);

                const endMinutes =
                  startMinutes + (Number(taskConflict.durationMinutes) || 0);

                return `${String(Math.floor(endMinutes / 60)).padStart(
                  2,
                  "0",
                )}:${String(endMinutes % 60).padStart(2, "0")}`;
              })(),
            };
          }
        }
      } catch {
        console.error("Não foi possível verificar conflitos com as tarefas.");
      }
    }

    return null;
  }

  async function handleSave(forceSave = false) {
    if (!title.trim() || isBeforeToday || isInvalidTime) {
      return;
    }

    const date = `${year}-${String(month + 1).padStart(
      2,
      "0",
    )}-${String(day).padStart(2, "0")}`;

    const startTime = `${String(startHour).padStart(
      2,
      "0",
    )}:${String(startMinute).padStart(2, "0")}`;

    const endTime = `${String(endHour).padStart(
      2,
      "0",
    )}:${String(endMinute).padStart(2, "0")}`;

    if (!forceSave) {
      const foundConflict = findConflict(date, startTime, endTime);

      if (foundConflict) {
        setConflict(foundConflict);
        return;
      }
    }

    const recurrenceEndDate =
      recurrence !== "none" && recurrenceEnd === "date"
        ? `${recurrenceEndYear}-${String(recurrenceEndMonth + 1).padStart(
            2,
            "0",
          )}-${String(recurrenceEndDay).padStart(2, "0")}`
        : null;

    const newActivity = {
      title: title.trim(),
      date,
      start: startTime,
      end: endTime,
      category,
      color: getCategoryColor(category),
      recurrence,
      recurrenceDays,
      recurrenceEnd,
      recurrenceEndDate,
    };

    try {
      const id = await createSupabaseActivity(newActivity);

      const currentActivities = getSavedActivities();

      saveActivities([
        ...currentActivities,
        {
          ...newActivity,
          id: Date.now(),
        },
      ]);

      router.push("/agenda");
    } catch (error) {
      console.error("Erro ao salvar compromisso:", error);
      alert(
        "Não foi possível salvar o compromisso no Supabase. Verifique se você está conectado à sua conta e tente novamente.",
      );
    }
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

          <p className="mt-8 text-sm text-zinc-500">Nova criação</p>

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
            <label className="text-sm font-medium text-zinc-300">Data</label>

            <div className="mt-2 grid grid-cols-[0.8fr_1.5fr_1fr] gap-2">
              {/* Dia */}
              <select
                value={day}
                onChange={(event) => setDay(Number(event.target.value))}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {Array.from({ length: maxDay }, (_, index) => index + 1)
                  .filter((item) => {
                    if (year === today.year && month === today.month) {
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
                onChange={(event) => changeMonth(Number(event.target.value))}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {months.map((item, index) => {
                  const disabled = year === today.year && index < today.month;

                  return (
                    <option key={item} value={index} disabled={disabled}>
                      {item}
                    </option>
                  );
                })}
              </select>

              {/* Ano */}
              <select
                value={year}
                onChange={(event) => changeYear(Number(event.target.value))}
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

          {/* Recorrência */}
          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Repetição
            </label>

            <select
              value={recurrence}
              onChange={(event) =>
                setRecurrence(
                  event.target.value as
                    | "none"
                    | "weekly"
                    | "weekdays"
                    | "custom",
                )
              }
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
            >
              <option value="none">Não se repete</option>
              <option value="weekly">Toda semana</option>
              <option value="weekdays">Segunda a sexta</option>
              <option value="custom">Personalizado</option>
            </select>

            {recurrence === "custom" && (
              <div className="mt-3 grid grid-cols-7 gap-2">
                {[
                  { label: "D", value: 0 },
                  { label: "S", value: 1 },
                  { label: "T", value: 2 },
                  { label: "Q", value: 3 },
                  { label: "Q", value: 4 },
                  { label: "S", value: 5 },
                  { label: "S", value: 6 },
                ].map((dayOption) => {
                  const selected = recurrenceDays.includes(dayOption.value);

                  return (
                    <button
                      key={dayOption.value}
                      type="button"
                      onClick={() => {
                        setRecurrenceDays((current) =>
                          selected
                            ? current.filter((day) => day !== dayOption.value)
                            : [...current, dayOption.value],
                        );
                      }}
                      className={`rounded-xl border px-2 py-3 text-sm transition ${
                        selected
                          ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {dayOption.label}
                    </button>
                  );
                })}
              </div>
            )}

            {recurrence !== "none" && (
              <div className="mt-5">
                <label className="text-sm font-medium text-zinc-300">
                  Termina
                </label>

                <select
                  value={recurrenceEnd}
                  onChange={(event) =>
                    setRecurrenceEnd(event.target.value as "never" | "date")
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-600"
                >
                  <option value="never">Nunca</option>
                  <option value="date">Em uma data</option>
                </select>
              </div>
            )}

            {recurrence !== "none" && recurrenceEnd === "date" && (
              <div className="mt-3">
                <label className="text-sm font-medium text-zinc-300">
                  Data final
                </label>

                <div className="mt-2 grid grid-cols-[0.8fr_1.5fr_1fr] gap-2">
                  <select
                    value={recurrenceEndDay}
                    onChange={(event) =>
                      setRecurrenceEndDay(Number(event.target.value))
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from(
                      {
                        length: daysInMonth(
                          recurrenceEndMonth,
                          recurrenceEndYear,
                        ),
                      },
                      (_, index) => index + 1,
                    ).map((item) => (
                      <option key={item} value={item}>
                        {String(item).padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <select
                    value={recurrenceEndMonth}
                    onChange={(event) =>
                      setRecurrenceEndMonth(Number(event.target.value))
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {months.map((item, index) => (
                      <option key={item} value={index}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={recurrenceEndYear}
                    onChange={(event) =>
                      setRecurrenceEndYear(Number(event.target.value))
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
              </div>
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
                    {Array.from({ length: 24 }, (_, index) => index).map(
                      (hour) => (
                        <option key={hour} value={hour}>
                          {String(hour).padStart(2, "0")}
                        </option>
                      ),
                    )}
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
                    {Array.from({ length: 60 }, (_, index) => index).map(
                      (minute) => (
                        <option key={minute} value={minute}>
                          {String(minute).padStart(2, "0")}
                        </option>
                      ),
                    )}
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
                    onChange={(event) => setEndHour(Number(event.target.value))}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from({ length: 24 }, (_, index) => index).map(
                      (hour) => (
                        <option key={hour} value={hour}>
                          {String(hour).padStart(2, "0")}
                        </option>
                      ),
                    )}
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
                    {Array.from({ length: 60 }, (_, index) => index).map(
                      (minute) => (
                        <option key={minute} value={minute}>
                          {String(minute).padStart(2, "0")}
                        </option>
                      ),
                    )}
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
            onClick={() => handleSave(false)}
            disabled={!title || isBeforeToday || isInvalidTime}
            className="mt-8 w-full rounded-2xl bg-zinc-100 px-4 py-3 font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Salvar compromisso
          </button>
        </section>
        {conflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <p className="text-sm text-zinc-500">Conflito de horário</p>

              <h2 className="mt-2 text-xl font-semibold">
                Esse horário já está ocupado
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Você já tem{" "}
                <span className="font-medium text-zinc-200">
                  {conflict.title}
                </span>{" "}
                nesse período:
              </p>

              <p className="mt-2 text-sm font-medium text-zinc-200">
                {conflict.start} – {conflict.end}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setConflict(null)}
                  className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                >
                  Trocar horário
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConflict(null);
                    handleSave(true);
                  }}
                  className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white"
                >
                  Adicionar mesmo assim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
