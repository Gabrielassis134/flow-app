"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  Plus,
  CheckSquare,
  Users,
} from "lucide-react";

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
      <div className="mx-auto grid max-w-3xl grid-cols-5 items-center rounded-2xl border border-zinc-800 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-xl">

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
                className="flex flex-col items-center justify-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950 shadow-lg transition hover:scale-105 hover:bg-white">
                  <Icon size={24} strokeWidth={2.5} />
                </div>

                <span className="mt-1 text-[11px] text-zinc-500">
                  Criar
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center rounded-xl py-2 transition ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300"
              }`}
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.3 : 1.8}
              />

              <span className="mt-1 text-[11px]">
                {link.label}
              </span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}