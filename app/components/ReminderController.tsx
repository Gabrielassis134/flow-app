"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { Activity } from "../lib/activities";
import { getInboxCount, INBOX_CHANGED_EVENT } from "../lib/group-items";
import {
  getNotificationPermission,
  hasFired,
  markFired,
  readNotificationPreferences,
  registerServiceWorker,
  showSystemNotification,
} from "../lib/notifications";
import {
  describeReminder,
  describeSummary,
  getDueReminders,
  getMorningSummary,
} from "../lib/reminders";
import { getSupabaseActivities } from "../lib/supabase-activities";
import { getTasks, type Task } from "../lib/tasks";

type Toast = {
  id: string;
  title: string;
  body: string;
  href: string;
};

const CHECK_INTERVAL_MS = 30_000;
const DATA_REFRESH_MS = 2 * 60_000;
const INBOX_REFRESH_MS = 60_000;
const TOAST_DURATION_MS = 12_000;

/**
 * Fica montado em todas as páginas privadas. Confere a agenda a cada 30
 * segundos e avisa dentro do app (sempre) e pelo sistema (quando a aba está
 * em segundo plano e a pessoa liberou as notificações do navegador).
 * Só funciona com o Flow aberto no navegador.
 */
export default function ReminderController() {
  const router = useRouter();
  const pathname = usePathname();

  const dataRef = useRef<{ activities: Activity[]; tasks: Task[] }>({
    activities: [],
    tasks: [],
  });
  const inboxBaseline = useRef<number | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (notification: {
      id: string;
      title: string;
      body: string;
      href: string;
    }) => {
      setToasts((current) =>
        [
          ...current.filter((toast) => toast.id !== notification.id),
          notification,
        ].slice(-3),
      );

      // Com a aba à vista, o aviso dentro do app basta.
      const pageInView =
        document.visibilityState === "visible" && document.hasFocus();

      if (!pageInView) {
        void showSystemNotification({
          title: notification.title,
          body: notification.body,
          tag: notification.id,
          url: notification.href,
        });
      }
    },
    [],
  );

  // Se a permissão já foi dada, deixa o service worker pronto.
  useEffect(() => {
    if (getNotificationPermission() === "granted") {
      void registerServiceWorker();
    }
  }, []);

  // Carrega compromissos e tarefas; atualiza ao trocar de página, a cada
  // 2 minutos e ao voltar para a aba.
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [activities, tasks] = await Promise.all([
          getSupabaseActivities(),
          getTasks(),
        ]);

        if (active) dataRef.current = { activities, tasks };
      } catch (error) {
        console.error("Erro ao carregar dados dos lembretes:", error);
      }
    }

    void loadData();

    const interval = window.setInterval(() => void loadData(), DATA_REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadData();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [pathname]);

  // Confere os lembretes a cada 30 segundos.
  useEffect(() => {
    function check() {
      const preferences = readNotificationPreferences();

      if (!preferences.notificationsEnabled) return;

      const now = new Date();
      const { activities, tasks } = dataRef.current;

      const reminders = getDueReminders({
        now,
        activities,
        tasks,
        leadMinutes: preferences.reminderLeadMinutes,
        includeActivities: preferences.activityReminders,
        includeTasks: preferences.taskReminders,
      });

      for (const reminder of reminders) {
        // Marca antes de avisar, para não repetir (nem em outra aba aberta).
        if (hasFired(reminder.key)) continue;

        markFired(reminder.key);

        notify({
          id: reminder.key,
          title: reminder.title,
          body: describeReminder(reminder),
          href: reminder.href,
        });
      }

      if (preferences.taskReminders) {
        const summary = getMorningSummary(now, tasks);

        if (summary && !hasFired(summary.key)) {
          markFired(summary.key);

          notify({
            id: summary.key,
            title: "Suas tarefas de hoje",
            body: describeSummary(summary),
            href: "/tarefas",
          });
        }
      }
    }

    const firstCheck = window.setTimeout(check, 5000);
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstCheck);
      window.clearInterval(interval);
    };
  }, [notify]);

  // Avisa quando chegam novos convites ou pedidos na caixa de entrada.
  // O primeiro valor lido só serve de ponto de partida (sem notificar).
  useEffect(() => {
    let active = true;

    async function checkInbox() {
      try {
        const count = await getInboxCount();

        if (!active) return;

        const previous = inboxBaseline.current;

        inboxBaseline.current = count;

        if (previous === null || count <= previous) return;

        const preferences = readNotificationPreferences();

        if (!preferences.notificationsEnabled || !preferences.groupReminders) {
          return;
        }

        notify({
          id: "inbox",
          title: "Caixa de entrada",
          body:
            count === 1
              ? "Você tem 1 pendência esperando resposta."
              : `Você tem ${count} pendências esperando resposta.`,
          href: "/caixa-de-entrada",
        });
      } catch (error) {
        console.error("Erro ao conferir a caixa de entrada:", error);
      }
    }

    void checkInbox();

    const interval = window.setInterval(
      () => void checkInbox(),
      INBOX_REFRESH_MS,
    );

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void checkInbox();
    };

    const handleChanged = () => void checkInbox();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(INBOX_CHANGED_EVENT, handleChanged);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(INBOX_CHANGED_EVENT, handleChanged);
    };
  }, [notify]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-20 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onOpen={() => {
            dismiss(toast.id);
            router.push(toast.href);
          }}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onOpen,
  onDismiss,
}: {
  toast: Toast;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  // O tempo de vida não reinicia quando a tela é redesenhada.
  useEffect(() => {
    const timer = window.setTimeout(
      () => dismissRef.current(),
      TOAST_DURATION_MS,
    );

    return () => window.clearTimeout(timer);
  }, [toast.id]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-zinc-700 border-l-4 border-l-sky-400 bg-zinc-900 p-4 shadow-2xl"
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-semibold text-zinc-100">
          {toast.title}
        </p>

        <p className="mt-1 text-sm text-zinc-400">{toast.body}</p>
      </button>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso"
        className="shrink-0 rounded-lg px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
      >
        ✕
      </button>
    </div>
  );
}
