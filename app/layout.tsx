import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./components/BottomNav";

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
    <html lang="pt-BR">
      <body className="pb-24">
        {children}

        <BottomNav />
      </body>
    </html>
  );
}