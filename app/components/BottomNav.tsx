"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  CalendarDays,
  Plus,
  CheckSquare,
  Users,
  Menu,
  X,
  Image as ImageIcon,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/", label: "Início", icon: Home },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/criar", label: "Criar", icon: Plus },
    { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
    { href: "/grupos", label: "Grupos", icon: Users },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const logoTextClass =
    "!text-slate-900 dark:!text-white text-xl font-bold tracking-tight";

  const logoIconClass =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

  const getLinkClass = (active: boolean) =>
    `relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors duration-150 ${
      active
        ? "font-semibold text-sky-700 after:absolute after:inset-x-4 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-sky-600 dark:text-sky-300 dark:after:bg-sky-400"
        : "text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100"
    }`;

  const getMobileLinkClass = (active: boolean) =>
    `flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors duration-150 ${
      active
        ? "font-semibold text-sky-700 dark:text-sky-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    }`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="flow-mobile-menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:hidden"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            aria-label="Flow - Início"
            className="ml-auto flex items-center gap-2 lg:ml-0"
          >
            <span aria-hidden="true" className={logoIconClass}>
              <ImageIcon size={19} />
            </span>

            <span className={logoTextClass}>Flow</span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 lg:flex"
          >
            {links.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={getLinkClass(active)}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          aria-label="Fechar menu de navegação"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
        />
      )}

      <aside
        id="flow-mobile-menu"
        aria-label="Menu lateral"
        aria-hidden={!menuOpen}
        className={`fixed inset-y-0 left-0 z-[70] flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-zinc-800">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            aria-label="Flow - Início"
            className="flex items-center gap-2"
          >
            <span aria-hidden="true" className={logoIconClass}>
              <ImageIcon size={19} />
            </span>

            <span className={logoTextClass}>Flow</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <X size={22} />
          </button>
        </div>

        <nav aria-label="Navegação móvel" className="flex flex-col gap-1 p-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={getMobileLinkClass(active)}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
