import type { Task } from "./tasks";
import {
  activityOccursOnDate,
  addDays,
  dateKey,
  timeToMinutes,
  type ScheduledActivity,
} from "./schedule";

/**
 * Regras dos lembretes, sem nenhuma dependência de tela ou de navegador.
 * Usa as mesmas funções de agenda do resto do app, então atividades que se
 * repetem (semanal, dias úteis, personalizado) também geram lembretes.
 */

export type ReminderActivity = ScheduledActivity & { id: string };

export type Reminder = {
  /** Identifica a ocorrência; evita avisar duas vezes a mesma coisa. */
  key: string;
  kind: "activity" | "task";
  title: string;
  /** Horário de início, "HH:mm". */
  start: string;
  minutesUntil: number;
  href: string;
};

export type MorningSummary = {
  key: string;
  today: number;
  overdue: number;
};

const SUMMARY_FROM_MINUTES = 8 * 60;
const SUMMARY_UNTIL_MINUTES = 12 * 60;

/**
 * Lembretes que devem ser mostrados agora: o início está dentro da
 * antecedência escolhida e ainda não passou. Olha hoje e amanhã, para
 * avisar de um compromisso logo após a meia-noite.
 */
export function getDueReminders(params: {
  now: Date;
  activities: ReminderActivity[];
  tasks: Task[];
  leadMinutes: number;
  includeActivities: boolean;
  includeTasks: boolean;
}): Reminder[] {
  const { now, activities, tasks, leadMinutes } = params;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const reminders: Reminder[] = [];

  const days = [
    { offset: 0, key: dateKey(now) },
    { offset: 1, key: dateKey(addDays(now, 1)) },
  ];

  for (const day of days) {
    const base = day.offset * 1440;

    if (params.includeActivities) {
      for (const activity of activities) {
        if (!activity.start) continue;
        if (!activityOccursOnDate(activity, day.key)) continue;

        const start = base + timeToMinutes(activity.start);

        if (nowMinutes >= start - leadMinutes && nowMinutes < start) {
          reminders.push({
            key: `activity:${activity.id}:${day.key}`,
            kind: "activity",
            title: activity.title,
            start: activity.start,
            minutesUntil: start - nowMinutes,
            href: "/agenda",
          });
        }
      }
    }

    if (params.includeTasks) {
      for (const task of tasks) {
        if (task.completed || !task.hasTime || !task.startTime) continue;
        if (task.date !== day.key) continue;

        const start = base + timeToMinutes(task.startTime);

        if (nowMinutes >= start - leadMinutes && nowMinutes < start) {
          reminders.push({
            key: `task:${task.id}:${day.key}`,
            kind: "task",
            title: task.title,
            start: task.startTime,
            minutesUntil: start - nowMinutes,
            href: "/tarefas",
          });
        }
      }
    }
  }

  return reminders.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

/**
 * Resumo da manhã (entre 8h e 12h): tarefas de hoje sem horário e tarefas
 * atrasadas. As tarefas com horário já têm o lembrete próprio.
 */
export function getMorningSummary(
  now: Date,
  tasks: Task[],
): MorningSummary | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (
    nowMinutes < SUMMARY_FROM_MINUTES ||
    nowMinutes >= SUMMARY_UNTIL_MINUTES
  ) {
    return null;
  }

  const todayKey = dateKey(now);

  let today = 0;
  let overdue = 0;

  for (const task of tasks) {
    if (task.completed || !task.date) continue;

    if (task.date === todayKey && !task.hasTime) {
      today += 1;
    } else if (task.date < todayKey) {
      overdue += 1;
    }
  }

  if (today === 0 && overdue === 0) return null;

  return { key: `summary:${todayKey}`, today, overdue };
}

/* ------------------------------------------------------------------ */
/* Textos                                                             */
/* ------------------------------------------------------------------ */

export function describeMinutes(minutes: number) {
  if (minutes <= 1) return "em 1 minuto";
  if (minutes < 60) return `em ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0) return hours === 1 ? "em 1 hora" : `em ${hours} horas`;

  return `em ${hours}h ${String(rest).padStart(2, "0")}min`;
}

export function describeReminder(reminder: Reminder) {
  const prefix = reminder.kind === "activity" ? "Começa" : "Tarefa marcada";

  return `${prefix} ${describeMinutes(reminder.minutesUntil)}, às ${reminder.start}.`;
}

export function describeSummary(summary: MorningSummary) {
  const parts: string[] = [];

  if (summary.today > 0) {
    parts.push(
      summary.today === 1
        ? "1 tarefa para hoje"
        : `${summary.today} tarefas para hoje`,
    );
  }

  if (summary.overdue > 0) {
    parts.push(
      summary.overdue === 1
        ? "1 tarefa atrasada"
        : `${summary.overdue} tarefas atrasadas`,
    );
  }

  return `Você tem ${parts.join(" e ")}.`;
}
