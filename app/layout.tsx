import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "./components/LayoutShell";
import ThemeController from "./components/ThemeController";

export const metadata: Metadata = {
  title: "Flow",
  description: "Organize sua rotina. Viva seu tempo.",
};

// Aplica o tema salvo antes da primeira pintura, evitando a "piscada".
// Mesma regra do ThemeController: sem valor salvo, o tema padrão é o escuro.
const themeScript = `
(function () {
  var root = document.documentElement;
  try {
    var saved = JSON.parse(localStorage.getItem("flow-settings") || "{}");
    var theme = saved && saved.theme;
    if (theme !== "light" && theme !== "system") theme = "dark";

    var isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    root.dataset.theme = isDark ? "dark" : "light";
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch (error) {
    root.dataset.theme = "dark";
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeController />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
