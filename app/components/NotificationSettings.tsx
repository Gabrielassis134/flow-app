"use client";

import { useEffect, useState } from "react";

import {
  getNotificationPermission,
  LEAD_MINUTES_OPTIONS,
  requestNotificationPermission,
  showSystemNotification,
  type PermissionState,
} from "../lib/notifications";

type NotificationSettingsProps = {
  leadMinutes: number;
  disabled: boolean;
  onLeadMinutesChange: (value: number) => void;
};

function leadLabel(minutes: number) {
  return minutes === 60 ? "1 hora antes" : `${minutes} minutos antes`;
}

export default function NotificationSettings({
  leadMinutes,
  disabled,
  onLeadMinutesChange,
}: NotificationSettingsProps) {
  // Começa como "default" para o servidor e o navegador renderizarem igual;
  // o valor real é lido logo depois de montar.
  const [permission, setPermission] = useState<PermissionState>("default");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  async function handleEnable() {
    setMessage("");

    const result = await requestNotificationPermission();

    setPermission(result);

    if (result === "denied") {
      setMessage(
        "O navegador bloqueou as notificações. Libere nas permissões do site (ícone de cadeado ao lado do endereço).",
      );
    }
  }

  async function handleTest() {
    setMessage("");

    await showSystemNotification({
      title: "Flow",
      body: "Tudo certo! Os lembretes chegarão assim.",
      tag: "flow-test",
      url: "/",
    });

    setMessage("Notificação de teste enviada.");
  }

  return (
    <div
      className={`mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <label htmlFor="antecedencia-lembrete" className="text-sm font-medium">
        Avisar com antecedência
      </label>

      <select
        id="antecedencia-lembrete"
        value={leadMinutes}
        disabled={disabled}
        onChange={(event) => onLeadMinutesChange(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600"
      >
        {LEAD_MINUTES_OPTIONS.map((minutes) => (
          <option key={minutes} value={minutes}>
            {leadLabel(minutes)}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Vale para compromissos e tarefas com horário. De manhã, entre 8h e 12h,
        você também recebe um resumo das tarefas do dia e das atrasadas.
      </p>

      <div className="mt-4 border-t border-zinc-800 pt-4">
        <p className="text-sm font-medium">Notificações do navegador</p>

        {permission === "unsupported" && (
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Este navegador não oferece notificações do sistema. Os avisos
            aparecem dentro do Flow enquanto ele estiver aberto.
          </p>
        )}

        {permission === "default" && (
          <>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Ative para receber os avisos mesmo com o Flow em segundo plano.
              Dentro do app eles aparecem sempre.
            </p>

            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleEnable()}
              className="mt-3 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ativar notificações do navegador
            </button>
          </>
        )}

        {permission === "granted" && (
          <>
            <p className="mt-2 text-xs leading-5 text-emerald-400">
              Ativadas neste navegador.
            </p>

            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleTest()}
              className="mt-3 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar notificação de teste
            </button>
          </>
        )}

        {permission === "denied" && (
          <p className="mt-2 text-xs leading-5 text-amber-400">
            Bloqueadas neste navegador. Libere nas permissões do site (ícone de
            cadeado ao lado do endereço) para receber avisos em segundo plano.
          </p>
        )}

        {message && (
          <p role="status" className="mt-3 text-xs leading-5 text-zinc-400">
            {message}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-600">
        Os lembretes funcionam com o Flow aberto no navegador (a aba pode ficar
        em segundo plano).
      </p>
    </div>
  );
}
