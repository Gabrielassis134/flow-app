/**
 * Notificações do Flow: preferências salvas em Configurações, permissão do
 * navegador, envio de notificações do sistema e controle do que já foi
 * avisado (para nunca repetir o mesmo lembrete).
 */

const SETTINGS_STORAGE_KEY = "flow-settings";
const FIRED_STORAGE_KEY = "flow-reminders-fired";
const FIRED_TTL_MS = 2 * 24 * 60 * 60 * 1000;

export const LEAD_MINUTES_OPTIONS = [5, 10, 15, 30, 60];
export const DEFAULT_LEAD_MINUTES = 15;

export type NotificationPreferences = {
  notificationsEnabled: boolean;
  taskReminders: boolean;
  activityReminders: boolean;
  groupReminders: boolean;
  reminderLeadMinutes: number;
};

export type PermissionState = NotificationPermission | "unsupported";

export type SystemNotification = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

/* ------------------------------------------------------------------ */
/* Preferências                                                       */
/* ------------------------------------------------------------------ */

/** Lê as preferências de notificação da chave flow-settings. */
export function readNotificationPreferences(): NotificationPreferences {
  const defaults: NotificationPreferences = {
    notificationsEnabled: true,
    taskReminders: true,
    activityReminders: true,
    groupReminders: true,
    reminderLeadMinutes: DEFAULT_LEAD_MINUTES,
  };

  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    const lead = Number(parsed?.reminderLeadMinutes);

    return {
      notificationsEnabled: parsed?.notificationsEnabled !== false,
      taskReminders: parsed?.taskReminders !== false,
      activityReminders: parsed?.activityReminders !== false,
      groupReminders: parsed?.groupReminders !== false,
      reminderLeadMinutes: LEAD_MINUTES_OPTIONS.includes(lead)
        ? lead
        : DEFAULT_LEAD_MINUTES,
    };
  } catch {
    return defaults;
  }
}

/* ------------------------------------------------------------------ */
/* Permissão e service worker                                         */
/* ------------------------------------------------------------------ */

export function getNotificationPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Não foi possível registrar o service worker:", error);

    return null;
  }
}

/** Pede a permissão ao navegador (precisa ser chamada por um clique). */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  const result = await Notification.requestPermission();

  if (result === "granted") {
    void registerServiceWorker();
  }

  return result;
}

/**
 * Mostra uma notificação do sistema. No celular só funciona por meio do
 * service worker; no computador, se ele não estiver disponível, usa a
 * notificação comum do navegador.
 */
export async function showSystemNotification(
  notification: SystemNotification,
): Promise<void> {
  if (getNotificationPermission() !== "granted") return;

  const options: NotificationOptions = {
    body: notification.body,
    tag: notification.tag,
    icon: "/favicon.ico",
    data: { url: notification.url },
  };

  try {
    if ("serviceWorker" in navigator) {
      await registerServiceWorker();

      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) =>
          window.setTimeout(() => resolve(null), 3000),
        ),
      ]);

      if (registration) {
        await registration.showNotification(notification.title, options);
        return;
      }
    }

    new Notification(notification.title, options);
  } catch (error) {
    console.error("Não foi possível mostrar a notificação:", error);
  }
}

/* ------------------------------------------------------------------ */
/* Lembretes já enviados                                              */
/* ------------------------------------------------------------------ */

function readFired(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(FIRED_STORAGE_KEY) ?? "{}");

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function hasFired(key: string) {
  return key in readFired();
}

/** Marca o lembrete como enviado e descarta registros com mais de 2 dias. */
export function markFired(key: string) {
  const fired = readFired();
  const now = Date.now();

  for (const savedKey of Object.keys(fired)) {
    if (now - fired[savedKey] > FIRED_TTL_MS) delete fired[savedKey];
  }

  fired[key] = now;

  try {
    localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(fired));
  } catch {
    // Sem armazenamento, o pior caso é repetir um lembrete.
  }
}
