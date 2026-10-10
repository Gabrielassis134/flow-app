"use client";

import { useEffect } from "react";

const SETTINGS_STORAGE_KEY = "flow-settings";

type Theme = "dark" | "light" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.dataset.theme = isDark ? "dark" : "light";

  root.classList.toggle("dark", isDark);

  root.style.colorScheme = isDark ? "dark" : "light";
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!saved) {
      return "dark";
    }

    const parsed = JSON.parse(saved);

    if (
      parsed?.theme === "dark" ||
      parsed?.theme === "light" ||
      parsed?.theme === "system"
    ) {
      return parsed.theme;
    }
  } catch {
    // Usa o tema escuro como fallback.
  }

  return "dark";
}

export default function ThemeController() {
  useEffect(() => {
    const update = () => {
      applyTheme(readTheme());
    };

    update();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemTheme = () => {
      if (readTheme() === "system") {
        applyTheme("system");
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_STORAGE_KEY) {
        update();
      }
    };

    mediaQuery.addEventListener("change", handleSystemTheme);

    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemTheme);

      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}
