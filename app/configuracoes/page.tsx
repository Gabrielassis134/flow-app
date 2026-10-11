"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

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

type Profile = {
  id: string;
  username: string;
  display_name: string;
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

  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!saved) {
    return defaultSettings;
  }

  try {
    return {
      ...defaultSettings,
      ...JSON.parse(saved),
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
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

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const activeTheme = prefersDark ? "dark" : "light";

  root.setAttribute("data-theme", activeTheme);
  root.classList.toggle("dark", prefersDark);
  root.style.colorScheme = activeTheme;
}

export default function Configuracoes() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [nomeEditado, setNomeEditado] = useState("");
  const [usuarioEditado, setUsuarioEditado] = useState("");

  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [mensagemPerfil, setMensagemPerfil] = useState("");
  const [erroPerfil, setErroPerfil] = useState(false);

  useEffect(() => {
    const savedSettings = getSavedSettings();

    setSettings(savedSettings);
    applyTheme(savedSettings.theme);
  }, []);

  useEffect(() => {
    if (settings.theme) {
      applyTheme(settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemTheme() {
      if (settings.theme === "system") {
        applyTheme("system");
      }
    }

    mediaQuery.addEventListener("change", handleSystemTheme);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemTheme);
    };
  }, [settings.theme]);

  useEffect(() => {
    async function carregarPerfil() {
      setCarregandoPerfil(true);

      try {
        const {
          data: { user },
          error: erroUsuario,
        } = await supabase.auth.getUser();

        if (erroUsuario) throw erroUsuario;

        if (!user) {
          setProfile(null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile({
            id: data.id,
            username: data.username ?? "",
            display_name: data.display_name ?? "",
          });
        } else {
          // Usa os metadados do cadastro, se disponíveis.
          const novoPerfil: Profile = {
            id: user.id,
            username: user.user_metadata?.username ?? "gabriel.assis",
            display_name: user.user_metadata?.display_name ?? "Gabriel Assis",
          };

          setProfile(novoPerfil);
        }
      } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        setMensagemPerfil(
          "Não foi possível carregar o perfil. Tente atualizar a página.",
        );
        setErroPerfil(true);
      } finally {
        setCarregandoPerfil(false);
      }
    }

    carregarPerfil();
  }, []);

  function updateSetting<Key extends keyof Settings>(
    key: Key,
    value: Settings[Key],
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
      | "searchableProfile",
  ) {
    updateSetting(key, !settings[key]);
  }

  function abrirEdicaoPerfil() {
    if (!profile) return;

    setNomeEditado(profile.display_name);
    setUsuarioEditado(profile.username);
    setMensagemPerfil("");
    setErroPerfil(false);
    setModalPerfilAberto(true);
  }

  function atualizarUsuarioDigitado(valor: string) {
    // Aceita letras minúsculas, números, pontos e sublinhados.
    const normalizado = valor
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
      .slice(0, 30);

    setUsuarioEditado(normalizado);
  }

  async function salvarPerfil(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!profile) return;

    const nome = nomeEditado.trim();
    const username = usuarioEditado.trim().toLowerCase();

    if (nome.length < 2 || nome.length > 50) {
      setErroPerfil(true);
      setMensagemPerfil("O nome deve ter entre 2 e 50 caracteres.");
      return;
    }

    // Regras do nome de usuário:
    // 8 a 30 caracteres, letras minúsculas, números, pontos e sublinhados.
    if (
      username.length < 8 ||
      username.length > 30 ||
      !/^[a-z0-9._]+$/.test(username) ||
      username.startsWith(".") ||
      username.endsWith(".") ||
      username.includes("..")
    ) {
      setErroPerfil(true);
      setMensagemPerfil(
        "Use de 8 a 30 caracteres: letras minúsculas, números, pontos ou sublinhados. Não use pontos consecutivos nem comece ou termine com ponto.",
      );
      return;
    }

    setSalvandoPerfil(true);
    setMensagemPerfil("");
    setErroPerfil(false);

    try {
      const {
        data: { user },
        error: erroUsuario,
      } = await supabase.auth.getUser();

      if (erroUsuario) throw erroUsuario;
      if (!user) throw new Error("Faça login novamente para editar o perfil.");

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            username,
            display_name: nome,
          },
          { onConflict: "id" },
        )
        .select("id, username, display_name")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Esse nome de usuário já está sendo utilizado. Escolha outro.",
          );
        }

        throw error;
      }

      setProfile({
        id: data.id,
        username: data.username ?? username,
        display_name: data.display_name ?? nome,
      });

      // Mantém os metadados do usuário atualizados também.
      const { error: erroMetadados } = await supabase.auth.updateUser({
        data: {
          username,
          display_name: nome,
        },
      });

      if (erroMetadados) {
        console.error(
          "O perfil foi salvo, mas os metadados não foram atualizados:",
          erroMetadados,
        );
      }

      setModalPerfilAberto(false);
      setMensagemPerfil("");
    } catch (erro) {
      setErroPerfil(true);

      setMensagemPerfil(
        erro instanceof Error
          ? erro.message
          : "Não foi possível salvar as alterações.",
      );
    } finally {
      setSalvandoPerfil(false);
    }
  }

  const inicialAvatar = (
    profile?.display_name?.trim().charAt(0) || "F"
  ).toUpperCase();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header>
          <Link
            href="/"
            className="text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            ← Voltar
          </Link>

          <p className="mt-8 text-sm text-zinc-500">Personalização</p>

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
            <h2 className="text-lg font-medium">Aparência</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Escolha como o Flow deve aparecer.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ThemeButton
              title="Escuro"
              description="Sempre usar tema escuro."
              selected={settings.theme === "dark"}
              onClick={() => updateSetting("theme", "dark")}
            />

            <ThemeButton
              title="Claro"
              description="Sempre usar tema claro."
              selected={settings.theme === "light"}
              onClick={() => updateSetting("theme", "light")}
            />

            <ThemeButton
              title="Automático"
              description="Seguir o tema do dispositivo."
              selected={settings.theme === "system"}
              onClick={() => updateSetting("theme", "system")}
            />
          </div>
        </section>

        {/* Notificações */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-medium">Notificações</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Controle os lembretes que o Flow poderá enviar.
          </p>

          <div className="mt-5 divide-y divide-zinc-800">
            <SettingRow
              title="Notificações"
              description="Permitir que o Flow envie notificações."
              enabled={settings.notificationsEnabled}
              onClick={() => toggleSetting("notificationsEnabled")}
            />

            <SettingRow
              title="Lembretes de tarefas"
              description="Receber lembretes relacionados às suas tarefas."
              enabled={settings.taskReminders && settings.notificationsEnabled}
              disabled={!settings.notificationsEnabled}
              onClick={() => toggleSetting("taskReminders")}
            />

            <SettingRow
              title="Lembretes de compromissos"
              description="Receber lembretes antes dos seus compromissos."
              enabled={
                settings.activityReminders && settings.notificationsEnabled
              }
              disabled={!settings.notificationsEnabled}
              onClick={() => toggleSetting("activityReminders")}
            />

            <SettingRow
              title="Lembretes de grupos"
              description="Receber notificações sobre atividades de grupo."
              enabled={settings.groupReminders && settings.notificationsEnabled}
              disabled={!settings.notificationsEnabled}
              onClick={() => toggleSetting("groupReminders")}
            />
          </div>
        </section>

        {/* Privacidade */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-medium">Privacidade</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Controle como suas informações poderão ser compartilhadas.
          </p>

          <div className="mt-5 divide-y divide-zinc-800">
            <SettingRow
              title="Agenda pessoal privada"
              description="Outras pessoas não poderão visualizar seus compromissos pessoais."
              enabled={settings.privateSchedule}
              onClick={() => toggleSetting("privateSchedule")}
            />

            <SettingRow
              title="Permitir convites"
              description="Permitir que outras pessoas enviem convites para você."
              enabled={settings.allowInvites}
              onClick={() => toggleSetting("allowInvites")}
            />

            <SettingRow
              title="Permitir que encontrem meu usuário"
              description="Permitir que seu usuário seja encontrado para convites e grupos."
              enabled={settings.searchableProfile}
              onClick={() => toggleSetting("searchableProfile")}
            />
          </div>
        </section>

        {/* Calendário */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-medium">Calendário</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Defina como a semana deve começar.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ThemeButton
              title="Domingo"
              description="A semana começa no domingo."
              selected={settings.weekStartsOn === "sunday"}
              onClick={() => updateSetting("weekStartsOn", "sunday")}
            />

            <ThemeButton
              title="Segunda"
              description="A semana começa na segunda-feira."
              selected={settings.weekStartsOn === "monday"}
              onClick={() => updateSetting("weekStartsOn", "monday")}
            />
          </div>
        </section>

        {/* Conta */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-medium">Conta</h2>
          <p className="mt-1 text-sm text-zinc-400">Seu perfil no Flow.</p>

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 text-xl font-semibold"
              aria-label="Foto de perfil"
            >
              {inicialAvatar}
            </div>

            <div className="min-w-0 flex-1">
              {carregandoPerfil ? (
                <>
                  <p className="font-medium">Carregando perfil...</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Buscando suas informações.
                  </p>
                </>
              ) : profile ? (
                <>
                  <p className="truncate font-medium">
                    {profile.display_name || "Sem nome definido"}
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    @{profile.username || "sem_usuario"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Perfil indisponível</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Entre na sua conta para carregar o perfil.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={abrirEdicaoPerfil}
              disabled={!profile || carregandoPerfil}
              aria-label="Editar perfil"
              title="Editar perfil"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
              </svg>
            </button>
          </div>

          {mensagemPerfil && !modalPerfilAberto && (
            <p role="status" className="mt-3 text-sm text-red-400">
              {mensagemPerfil}
            </p>
          )}
        </section>

        {/* Sobre */}
        <section className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-medium">Sobre o Flow</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-500">
            <p>Flow — Organize sua rotina. Viva seu tempo.</p>
            <p>Suas preferências são salvas automaticamente.</p>
          </div>
        </section>
      </div>

      {/* Janela de edição do perfil */}
      {modalPerfilAberto && profile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget && !salvandoPerfil) {
              setModalPerfilAberto(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-editar-perfil"
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="titulo-editar-perfil" className="text-xl font-semibold">
                  Editar perfil
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Atualize suas informações pessoais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalPerfilAberto(false)}
                disabled={salvandoPerfil}
                aria-label="Fechar janela"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-900 hover:text-white disabled:opacity-40"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m18 6-12 12" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={salvarPerfil} className="mt-6 space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xl font-semibold">
                  {(nomeEditado.trim().charAt(0) || "F").toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-medium">Foto de perfil</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    A personalização da foto será disponibilizada em breve.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="nome-perfil"
                  className="mb-2 block text-sm font-medium"
                >
                  Nome
                </label>
                <input
                  id="nome-perfil"
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  autoComplete="name"
                  value={nomeEditado}
                  onChange={(evento) => setNomeEditado(evento.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-sky-500"
                  placeholder="Seu nome"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Esse nome pode ser igual ao de outras pessoas.
                </p>
              </div>

              <div>
                <label
                  htmlFor="usuario-perfil"
                  className="mb-2 block text-sm font-medium"
                >
                  Nome de usuário
                </label>

                <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900 focus-within:border-sky-500">
                  <span className="pl-4 text-zinc-500">@</span>
                  <input
                    id="usuario-perfil"
                    type="text"
                    required
                    minLength={8}
                    maxLength={30}
                    autoComplete="username"
                    spellCheck={false}
                    value={usuarioEditado}
                    onChange={(evento) =>
                      atualizarUsuarioDigitado(evento.target.value)
                    }
                    className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-3 lowercase outline-none"
                    placeholder="seu.usuario"
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  De 8 a 30 caracteres. Use letras minúsculas, números, pontos
                  ou sublinhados. O usuário deve ser único.
                </p>
              </div>

              {mensagemPerfil && (
                <p
                  role="alert"
                  className={`rounded-xl border p-3 text-sm ${
                    erroPerfil
                      ? "border-red-900/70 bg-red-950/40 text-red-300"
                      : "border-zinc-800 text-zinc-300"
                  }`}
                >
                  {mensagemPerfil}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={salvandoPerfil}
                  onClick={() => setModalPerfilAberto(false)}
                  className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvandoPerfil}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvandoPerfil ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

type ThemeButtonProps = {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
};

function ThemeButton({
  title,
  description,
  selected,
  onClick,
}: ThemeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-zinc-300 bg-zinc-100 text-zinc-950"
          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      <p className="font-medium">{title}</p>
      <p
        className={`mt-1 text-xs ${
          selected ? "text-zinc-600" : "text-zinc-500"
        }`}
      >
        {description}
      </p>
    </button>
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
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={`${title}: ${enabled ? "ativado" : "desativado"}`}
        aria-pressed={enabled}
        className={`flow-setting-toggle relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "flow-setting-toggle-on" : ""
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`flow-setting-thumb absolute top-1 h-5 w-5 rounded-full transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
