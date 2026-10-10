import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./components/BottomNav";
import ThemeController from "./components/ThemeController";

export const metadata: Metadata = {
  title: "Flow",
  description: "Organize sua rotina. Viva seu tempo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="pb-24">
        <ThemeController />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
