import Link from "next/link";

export default function Tarefas() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Flow
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Tarefas
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
          >
            Início
          </Link>
        </header>

        <div className="mt-10 space-y-3">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center gap-4">
              <div className="h-5 w-5 rounded-full border border-zinc-600" />

              <div>
                <h2 className="font-medium">
                  Estudar Física
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  1h30 · Alta prioridade
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center gap-4">
              <div className="h-5 w-5 rounded-full border border-zinc-600" />

              <div>
                <h2 className="font-medium">
                  Projeto de robótica
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  2h · Média prioridade
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}