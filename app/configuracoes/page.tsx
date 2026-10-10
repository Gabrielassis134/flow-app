"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Theme = "dark" | "light" | "system";

type Settings = {
  theme: Theme;
  notificationsEnabled: boolean;
  taskReminders: boolean;
  activityReminders: boolean;
  groupReminders: boolean;
  privateSchedule: boolean;
  allowInvites: boolean;
  searchableProfile: boolean;
  weekStartsOn: "sunday" | "monday";
};

const SETTINGS_STORAGE_KEY = "flow-settings";

const defaultSettings: Settings = {
  theme: "dark",
  notificationsEnabled: true,
  taskReminders: true,
  activityReminders: true,
  groupReminders: true,
  privateSchedule: true,
  allowInvites: true,
  searchableProfile: true,
  weekStartsOn: "sunday",
};

function getSavedSettings(): Settings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  const saved =
    localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!saved) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: Settings) {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  );
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "light") {
    root.setAttribute("data-theme", "light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    return;
  }

  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    return;
  }

  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const activeTheme = prefersDark
    ? "dark"
    : "light";

  root.setAttribute(
    "data-theme",
    activeTheme
  );

  root.classList.toggle(
    "dark",
    prefersDark
  );

  root.style.colorScheme = activeTheme;
}

export default function Configuracoes() {
  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  useEffect(() => {
    const savedSettings =
      getSavedSettings();

    setSettings(savedSettings);
    applyTheme(savedSettings.theme);
  }, []);

  useEffect(() => {
    if (settings.theme) {
      applyTheme(settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    function handleSystemTheme() {
      if (settings.theme === "system") {
        applyTheme("system");
      }
    }

    mediaQuery.addEventListener(
      "change",
      handleSystemTheme
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemTheme
      );
    };
  }, [settings.theme]);

  function updateSetting<
    Key extends keyof Settings
  >(
    key: Key,
    value: Settings[Key]
  ) {
    setSettings((current) => {
      const updated = {
        ...current,
        [key]: value,
      };

      saveSettings(updated);

      return updated;
    });
  }

  function toggleSetting(
    key:
      | "notificationsEnabled"
      | "taskReminders"
      | "activityReminders"
      | "groupReminders"
      | "privateSchedule"
      | "allowInvites"
      | "searchableProfile"
  ) {
    updateSetting(
      key,
      !settings[key]
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-8">

        {/* Cabeçalho */}
        <header>
          <Link
            href="/"
            className="text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            ← Voltar
          </Link>

          <p className="mt-8 text-sm text-zinc-500">
            Personalização
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Configurações
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Ajuste o Flow para funcionar do seu jeito.
          </p>
        </header>

        {/* Aparência */}
        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div>
            <h2 className="text-lg font-medium">
              Aparência
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Escolha como o Flow deve aparecer.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">

            <button
              onClick={() =>
                updateSetting(
                  "theme",
                  "dark"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                settings.theme === "dark"
                  ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <p className="font-medium">
                Escuro
              </p>

              <p
                className={`mt-1 text-xs ${
                  settings.theme === "dark"
                    ? "text-zinc-600"
                    : "text-zinc-500"
                }`}
              >
                Sempre usar tema escuro.
              </p>
            </button>

            <button
              onClick={() =>
                updateSetting(
                  "theme",
                  "light"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                settings.theme === "light"
                  ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <p className="font-medium">
                Claro
              </p>

              <p
                className={`mt-1 text-xs ${
                  settings.theme === "light"
                    ? "text-zinc-600"
                    : "text-zinc-500"
                }`}
              >
                Sempre usar tema claro.
              </p>
            </button>

            <button
              onClick={() =>
                updateSetting(
                  "theme",
                  "system"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                settings.theme === "system"
                  ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <p className="font-medium">
                Automático
              </p>

              <p
                className={`mt-1 text-xs ${
                  settings.theme === "system"
                    ? "text-zinc-600"
                    : "text-zinc-500"
                }`}
              >
                Seguir o tema do dispositivo.
              </p>
            </button>

          </div>
        </section>

        {/* Notificações */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div>
            <h2 className="text-lg font-medium">
              Notificações
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Controle os lembretes que o Flow poderá enviar.
            </p>
          </div>

          <div className="mt-5 divide-y divide-zinc-800">

            <SettingRow
              title="Notificações"
              description="Permitir que o Flow envie notificações."
              enabled={
                settings.notificationsEnabled
              }
              onClick={() =>
                toggleSetting(
                  "notificationsEnabled"
                )
              }
            />

            <SettingRow
              title="Lembretes de tarefas"
              description="Receber lembretes relacionados às suas tarefas."
              enabled={
                settings.taskReminders &&
                settings.notificationsEnabled
              }
              disabled={
                !settings.notificationsEnabled
              }
              onClick={() =>
                toggleSetting(
                  "taskReminders"
                )
              }
            />

            <SettingRow
              title="Lembretes de compromissos"
              description="Receber lembretes antes dos seus compromissos."
              enabled={
                settings.activityReminders &&
                settings.notificationsEnabled
              }
              disabled={
                !settings.notificationsEnabled
              }
              onClick={() =>
                toggleSetting(
                  "activityReminders"
                )
              }
            />

            <SettingRow
              title="Lembretes de grupos"
              description="Receber notificações sobre atividades de grupo."
              enabled={
                settings.groupReminders &&
                settings.notificationsEnabled
              }
              disabled={
                !settings.notificationsEnabled
              }
              onClick={() =>
                toggleSetting(
                  "groupReminders"
                )
              }
            />

          </div>
        </section>

        {/* Privacidade */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div>
            <h2 className="text-lg font-medium">
              Privacidade
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Controle como suas informações poderão ser compartilhadas.
            </p>
          </div>

          <div className="mt-5 divide-y divide-zinc-800">

            <SettingRow
              title="Agenda pessoal privada"
              description="Outras pessoas não poderão visualizar seus compromissos pessoais."
              enabled={
                settings.privateSchedule
              }
              onClick={() =>
                toggleSetting(
                  "privateSchedule"
                )
              }
            />

            <SettingRow
              title="Permitir convites"
              description="Permitir que outras pessoas enviem convites para você."
              enabled={
                settings.allowInvites
              }
              onClick={() =>
                toggleSetting(
                  "allowInvites"
                )
              }
            />

            <SettingRow
              title="Permitir que encontrem meu usuário"
              description="Permitir que seu usuário seja encontrado para convites e grupos."
              enabled={
                settings.searchableProfile
              }
              onClick={() =>
                toggleSetting(
                  "searchableProfile"
                )
              }
            />

          </div>
        </section>

        {/* Semana */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div>
            <h2 className="text-lg font-medium">
              Calendário
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Defina como a semana deve começar.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">

            <button
              onClick={() =>
                updateSetting(
                  "weekStartsOn",
                  "sunday"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                settings.weekStartsOn ===
                "sunday"
                  ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <p className="font-medium">
                Domingo
              </p>

              <p
                className={`mt-1 text-xs ${
                  settings.weekStartsOn ===
                  "sunday"
                    ? "text-zinc-600"
                    : "text-zinc-500"
                }`}
              >
                A semana começa no domingo.
              </p>
            </button>

            <button
              onClick={() =>
                updateSetting(
                  "weekStartsOn",
                  "monday"
                )
              }
              className={`rounded-2xl border p-4 text-left transition ${
                settings.weekStartsOn ===
                "monday"
                  ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <p className="font-medium">
                Segunda
              </p>

              <p
                className={`mt-1 text-xs ${
                  settings.weekStartsOn ===
                  "monday"
                    ? "text-zinc-600"
                    : "text-zinc-500"
                }`}
              >
                A semana começa na segunda-feira.
              </p>
            </button>

          </div>
        </section>

        {/* Conta */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div>
            <h2 className="text-lg font-medium">
              Conta
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Sua conta e sincronização aparecerão aqui.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-lg">
                F
              </div>

              <div>
                <p className="font-medium">
                  Conta local
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Seus dados estão salvos neste dispositivo.
                </p>
              </div>

            </div>

            <div className="mt-5 rounded-2xl bg-zinc-900 p-4">

              <p className="text-sm font-medium">
                Sincronização online
              </p>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Em breve você poderá entrar na sua conta
                e acessar seus dados em qualquer dispositivo.
              </p>

            </div>

          </div>
        </section>

        {/* Informações */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">

          <h2 className="text-lg font-medium">
            Sobre o Flow
          </h2>

          <div className="mt-4 space-y-2 text-sm text-zinc-500">
            <p>
              Flow — Organize sua rotina. Viva seu tempo.
            </p>

            <p>
              Suas preferências são salvas automaticamente.
            </p>
          </div>

        </section>

      </div>
    </main>
  );
}

type SettingRowProps = {
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function SettingRow({
  title,
  description,
  enabled,
  disabled = false,
  onClick,
}: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-5 py-5 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium">
          {title}
        </p>

        <p className="mt-1 text-sm leading-5 text-zinc-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={`${title}: ${
          enabled
            ? "ativado"
            : "desativado"
        }`}
        className={`flow-setting-toggle relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled
            ? "flow-setting-toggle-on"
            : ""
        } ${
          disabled
            ? "cursor-not-allowed"
            : "cursor-pointer"
        }`}
      >
        <span
          className={`flow-setting-thumb absolute top-1 h-5 w-5 rounded-full transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </div>
  );
}