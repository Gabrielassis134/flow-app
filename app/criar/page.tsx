"use client";

import { useRouter } from "next/navigation";

const options = [
  {
    title: "Nova tarefa",
    description: "Algo que precisa ser feito",
    icon: "✓",
    route: "/criar/tarefa",
  },
  {
    title: "Compromisso",
    description: "Um evento com horário",
    icon: "◷",
    route: "/criar/compromisso",
  },
  {
    title: "Atividade de grupo",
    description: "Algo envolvendo outras pessoas",
    icon: "👥",
    route: "/criar/grupo",
  },
];

export default function CriarPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header>
          <p className="text-sm text-zinc-500">
            Nova criação
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Criar
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            O que você quer criar?
          </p>
        </header>

        <section className="mt-8 space-y-3">
          {options.map((option) => (
            <button
              key={option.title}
              onClick={() => router.push(option.route)}
              className="flex w-full items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-lg">
                {option.icon}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-medium">
                  {option.title}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {option.description}
                </p>
              </div>

              <span className="text-xl text-zinc-600">
                ›
              </span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}