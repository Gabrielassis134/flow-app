import type { Task } from "./tasks";

/**
 * Regras compartilhadas de agenda: datas, horários, recorrência e conflitos.
 * Todas as páginas devem usar este módulo em vez de manter cópias locais.
 *
 * Convenções:
 * - Datas são strings "AAAA-MM-DD" (data local, sem fuso).
 * - Horários são strings "HH:mm".
 */

export type Recurrence = "none" | "weekly" | "weekdays" | "custom";

/** Campos mínimos para calcular em quais dias uma atividade acontece. */
export type RecurringItem = {
  date: string;
  recurrence?: Recurrence;
  recurrenceDays?: number[];
  recurrenceEnd?: "never" | "date";
  recurrenceEndDate?: string | null;
};

/** Uma atividade com horário (compatível com Activity de lib/activities). */
export type ScheduledActivity = RecurringItem & {
  title: string;
  start: string;
  end: string;
};

/** Um intervalo ocupado em um dia, vindo de uma atividade ou de uma tarefa. */
export type BusyItem = {
  kind: "activity" | "task";
  title: string;
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
};

/* ------------------------------------------------------------------ */
/* Datas                                                              */
/* ------------------------------------------------------------------ */

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Converte "AAAA-MM-DD" em uma data local à meia-noite. */
export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);

  return result;
}

/* ------------------------------------------------------------------ */
/* Horários                                                           */
/* ------------------------------------------------------------------ */

/** Aceita "HH:mm" e "HH:mm:ss" (formato devolvido pelo Postgres). */
export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + (minutes || 0);
}

/** Converte minutos em "HH:mm", voltando ao início após 24h. */
export function minutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

/** Dois intervalos (em minutos) se sobrepõem. Encostar nas pontas não conta. */
export function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && endA > startB;
}

/** Horário de término de uma tarefa com horário; "" se ela não tiver. */
export function getTaskEnd(task: Task) {
  if (!task.startTime) return "";

  return addMinutesToTime(task.startTime, Number(task.durationMinutes) || 0);
}

/* ------------------------------------------------------------------ */
/* Recorrência                                                        */
/* ------------------------------------------------------------------ */

/** A atividade acontece na data informada (considerando a repetição)? */
export function activityOccursOnDate(item: RecurringItem, date: Date | string) {
  const key = typeof date === "string" ? date : dateKey(date);

  if (key < item.date) return false;

  if (
    item.recurrenceEnd === "date" &&
    item.recurrenceEndDate &&
    key > item.recurrenceEndDate
  ) {
    return false;
  }

  const recurrence = item.recurrence ?? "none";

  if (recurrence === "none") return key === item.date;

  const dayOfWeek = parseDateKey(key).getDay();

  if (recurrence === "weekly") {
    return dayOfWeek === parseDateKey(item.date).getDay();
  }

  if (recurrence === "weekdays") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  if (recurrence === "custom") {
    return item.recurrenceDays?.includes(dayOfWeek) ?? false;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/* Conflitos                                                          */
/* ------------------------------------------------------------------ */

function createBusyItem(
  kind: BusyItem["kind"],
  title: string,
  startMinutes: number,
  endMinutes: number,
): BusyItem {
  return {
    kind,
    title,
    start: minutesToTime(startMinutes),
    end: minutesToTime(endMinutes),
    startMinutes,
    endMinutes,
  };
}

/**
 * Tudo o que ocupa horário em um dia: atividades (inclusive as que se
 * repetem) e tarefas com horário ainda não concluídas.
 */
export function getBusyItems(
  date: Date | string,
  activities: ScheduledActivity[],
  tasks: Task[],
  options?: { ignoreTaskId?: string },
): BusyItem[] {
  const key = typeof date === "string" ? date : dateKey(date);
  const items: BusyItem[] = [];

  for (const activity of activities) {
    if (!activity.start || !activity.end) continue;
    if (!activityOccursOnDate(activity, key)) continue;

    items.push(
      createBusyItem(
        "activity",
        activity.title,
        timeToMinutes(activity.start),
        timeToMinutes(activity.end),
      ),
    );
  }

  for (const task of tasks) {
    if (task.completed || !task.hasTime || !task.startTime) continue;
    if (task.date !== key) continue;
    if (task.id === options?.ignoreTaskId) continue;

    const startMinutes = timeToMinutes(task.startTime);

    items.push(
      createBusyItem(
        "task",
        task.title,
        startMinutes,
        startMinutes + (Number(task.durationMinutes) || 0),
      ),
    );
  }

  return items;
}

/**
 * Procura o primeiro item que ocupa o horário pedido.
 * Informe o término em `end` ou a duração em `durationMinutes`.
 */
export function findConflict(params: {
  date: string;
  start: string;
  end?: string;
  durationMinutes?: number;
  activities: ScheduledActivity[];
  tasks: Task[];
  ignoreTaskId?: string;
}): BusyItem | null {
  const startMinutes = timeToMinutes(params.start);

  const endMinutes = params.end
    ? timeToMinutes(params.end)
    : startMinutes + (params.durationMinutes ?? 0);

  const busyItems = getBusyItems(params.date, params.activities, params.tasks, {
    ignoreTaskId: params.ignoreTaskId,
  });

  return (
    busyItems.find((item) =>
      rangesOverlap(
        startMinutes,
        endMinutes,
        item.startMinutes,
        item.endMinutes,
      ),
    ) ?? null
  );
}
