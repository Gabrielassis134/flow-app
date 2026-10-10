"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Plus, CheckSquare, Users } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    {
      href: "/",
      label: "Início",
      icon: Home,
    },
    {
      href: "/agenda",
      label: "Agenda",
      icon: CalendarDays,
    },
    {
      href: "/criar",
      label: "Criar",
      icon: Plus,
      create: true,
    },
    {
      href: "/tarefas",
      label: "Tarefas",
      icon: CheckSquare,
    },
    {
      href: "/grupos",
      label: "Grupos",
      icon: Users,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="mx-auto grid max-w-3xl grid-cols-5 items-center rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95">
        {links.map((link) => {
          const Icon = link.icon;

          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          if (link.create) {
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label="Criar"
                className="flex flex-col items-center justify-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 shadow-sm transition hover:scale-105 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white">
                  <Icon size={24} strokeWidth={2.5} />
                </div>

                <span className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                  Criar
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center rounded-xl py-2 transition ${
                active
                  ? "text-sky-700 dark:text-sky-300"
                  : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />

              <span
                className={`mt-1 text-[11px] ${
                  active ? "font-semibold" : "font-normal"
                }`}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
