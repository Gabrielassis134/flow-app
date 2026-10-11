"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask, getTasks } from "../../lib/tasks";
import { getSupabaseActivities } from "../../lib/supabase-activities";

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

  const [conflict, setConflict] = useState<{
    title: string;
    start: string;
    end: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const currentYear = today.getFullYear();

  const maxDay = new Date(year, month + 1, 0).getDate();

  const isBeforeToday =
    year < currentYear ||
    (year === currentYear && month < today.getMonth()) ||
    (year === currentYear &&
      month === today.getMonth() &&
      day < today.getDate());

  function changeMonth(value: number) {
    setMonth(value);

    const newMaxDay = new Date(year, value + 1, 0).getDate();

    if (day > newMaxDay) {
      setDay(newMaxDay);
    }
  }

  function changeYear(value: number) {
    setYear(value);

    const newMaxDay = new Date(value, month + 1, 0).getDate();

    if (day > newMaxDay) {
      setDay(newMaxDay);
    }
  }

  function timeToMinutes(time: string) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }

  function minutesToTime(minutes: number) {
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
    const hour = Math.floor(normalizedMinutes / 60);
    const minute = normalizedMinutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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

  async function findConflict(
    date: string,
    startTime: string,
    durationMinutes: number,
  ) {
    const endTime = minutesToTime(timeToMinutes(startTime) + durationMinutes);

    const [activities, tasks] = await Promise.all([
      getSupabaseActivities(),
      getTasks(),
    ]);

    const activityConflict = activities.find(
      (activity) =>
        activity.date === date &&
        overlaps(startTime, endTime, activity.start, activity.end),
    );

    if (activityConflict) {
      return {
        title: activityConflict.title,
        start: activityConflict.start,
        end: activityConflict.end,
      };
    }

    const taskConflict = tasks.find((task) => {
      if (
        task.completed ||
        !task.hasTime ||
        !task.startTime ||
        !task.durationMinutes ||
        task.date !== date
      ) {
        return false;
      }

      const taskEndTime = minutesToTime(
        timeToMinutes(task.startTime) + task.durationMinutes,
      );

      return overlaps(startTime, endTime, task.startTime, taskEndTime);
    });

    if (taskConflict && taskConflict.startTime) {
      return {
        title: taskConflict.title,
        start: taskConflict.startTime,
        end: minutesToTime(
          timeToMinutes(taskConflict.startTime) + taskConflict.durationMinutes,
        ),
      };
    }

    return null;
  }

  async function handleSave(forceSave = false) {
    if (saving) return;

    setSaveError("");

    if (!title.trim()) {
      setSaveError("Informe o nome da tarefa.");
      return;
    }

    if (isBeforeToday) {
      setSaveError("O prazo não pode ser anterior a hoje.");
      return;
    }

    if (durationHours === 0 && durationMinutes === 0) {
      setSaveError("A duração deve ser maior que zero.");
      return;
    }

    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const startTime = hasTime
      ? `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`
      : null;

    const taskDurationMinutes = durationHours * 60 + durationMinutes;

    if (hasTime && startTime && !forceSave) {
      try {
        const foundConflict = await findConflict(
          date,
          startTime,
          taskDurationMinutes,
        );

        if (foundConflict) {
          setConflict(foundConflict);
          return;
        }
      } catch (error) {
        console.error("Erro ao verificar conflitos:", error);
        setSaveError(
          "Não foi possível verificar os conflitos de horário. Confira sua conexão e tente novamente.",
        );
        return;
      }
    }

    setSaving(true);

    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        date,
        durationMinutes: taskDurationMinutes,
        duration: `${durationHours}h ${String(durationMinutes).padStart(2, "0")}min`,
        priority,
        category,
        hasTime,
        startTime,
        completed: false,
      });

      router.push("/tarefas");
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);

      setSaveError(
        error instanceof Error
          ? `Não foi possível salvar a tarefa: ${error.message}`
          : "Não foi possível salvar a tarefa. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <header>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-500 transition hover:text-zinc-200"
          >
            ← Voltar
          </button>

          <p className="mt-8 text-sm text-zinc-500">Nova criação</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Nova tarefa
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Organize algo que precisa ser feito.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <div>
            <label className="text-sm font-medium text-zinc-300">
              Nome da tarefa
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Estudar Física"
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Descrição
              <span className="ml-2 text-xs font-normal text-zinc-600">
                opcional
              </span>
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: Revisar as leis de Newton"
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>

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

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Prioridade
            </label>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["Alta", "Média", "Baixa"] as Priority[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPriority(item)}
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

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">Prazo</label>

            <div className="mt-2 grid grid-cols-[0.8fr_1.5fr_1fr] gap-2">
              <select
                value={day}
                onChange={(event) => setDay(Number(event.target.value))}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {Array.from({ length: maxDay }, (_, index) => index + 1)
                  .filter((item) => {
                    if (year === currentYear && month === today.getMonth()) {
                      return item >= today.getDate();
                    }

                    return true;
                  })
                  .map((item) => (
                    <option key={item} value={item}>
                      {String(item).padStart(2, "0")}
                    </option>
                  ))}
              </select>

              <select
                value={month}
                onChange={(event) => changeMonth(Number(event.target.value))}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {months.map((item, index) => {
                  const disabled =
                    year === currentYear && index < today.getMonth();

                  return (
                    <option key={item} value={index} disabled={disabled}>
                      {item}
                    </option>
                  );
                })}
              </select>

              <select
                value={year}
                onChange={(event) => changeYear(Number(event.target.value))}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
              >
                {Array.from(
                  { length: 6 },
                  (_, index) => currentYear + index,
                ).map((item) => (
                  <option key={item} value={item}>
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

          <div className="mt-5">
            <label className="text-sm font-medium text-zinc-300">
              Duração estimada
            </label>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <select
                  value={durationHours}
                  onChange={(event) =>
                    setDurationHours(Number(event.target.value))
                  }
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                >
                  {Array.from({ length: 13 }, (_, index) => index).map(
                    (hour) => (
                      <option key={hour} value={hour}>
                        {hour}h
                      </option>
                    ),
                  )}
                </select>

                <p className="mt-1 text-center text-[11px] text-zinc-600">
                  Horas
                </p>
              </div>

              <div>
                <select
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(Number(event.target.value))
                  }
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                >
                  {[0, 15, 30, 45].map((minute) => (
                    <option key={minute} value={minute}>
                      {String(minute).padStart(2, "0")} min
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-center text-[11px] text-zinc-600">
                  Minutos
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <button
              type="button"
              onClick={() => setHasTime(!hasTime)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-medium">Definir horário</p>

                <p className="mt-1 text-xs text-zinc-500">
                  {hasTime
                    ? "A tarefa terá um horário específico."
                    : "O Flow poderá encontrar um horário livre depois."}
                </p>
              </div>

              <div
                className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
                  hasTime ? "bg-sky-400" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full transition ${
                    hasTime ? "translate-x-5 bg-zinc-950" : "bg-zinc-500"
                  }`}
                />
              </div>
            </button>

            {hasTime && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500">Hora</label>

                  <select
                    value={startHour}
                    onChange={(event) =>
                      setStartHour(Number(event.target.value))
                    }
                    className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {Array.from({ length: 24 }, (_, index) => index).map(
                      (hour) => (
                        <option key={hour} value={hour}>
                          {String(hour).padStart(2, "0")}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-500">Minuto</label>

                  <select
                    value={startMinute}
                    onChange={(event) =>
                      setStartMinute(Number(event.target.value))
                    }
                    className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm outline-none focus:border-zinc-600"
                  >
                    {[0, 15, 30, 45].map((minute) => (
                      <option key={minute} value={minute}>
                        {String(minute).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {saveError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"
            >
              {saveError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              saving ||
              !title.trim() ||
              isBeforeToday ||
              (durationHours === 0 && durationMinutes === 0)
            }
            className="mt-8 w-full rounded-2xl bg-zinc-100 px-4 py-3 font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Salvando..." : "Salvar tarefa"}
          </button>
        </section>
      </div>

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-xl text-amber-300">
              !
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Esse horário já está ocupado
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              A tarefa que você está criando entra em conflito com uma atividade
              já existente.
            </p>

            <div className="mt-5 rounded-2xl bg-zinc-950 p-4">
              <p className="font-medium text-zinc-200">{conflict.title}</p>

              <p className="mt-1 text-sm text-zinc-500">
                {conflict.start} – {conflict.end}
              </p>
            </div>

            <p className="mt-4 text-sm text-zinc-400">
              Você pode manter a tarefa nesse horário mesmo assim ou voltar e
              escolher outro horário.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setConflict(null)}
                className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Trocar horário
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setConflict(null);
                  void handleSave(true);
                }}
                className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-50"
              >
                Manter mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
