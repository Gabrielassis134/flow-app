import Link from "next/link";

export default function Agenda() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Flow
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Agenda
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
          >
            Início
          </Link>
        </header>

        <div className="mt-10 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">
              Domingo, 4 de outubro
            </p>

            <h2 className="mt-1 text-xl font-medium">
              Hoje
            </h2>
          </div>

          <Link
            href="/criar"
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            + Criar
          </Link>
        </div>

        <div className="mt-8 space-y-4">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">
              17:00 – 18:30
            </p>

            <h3 className="mt-2 text-lg font-medium">
              Ensaio na igreja
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Igreja
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">
              19:00 – 21:00
            </p>

            <h3 className="mt-2 text-lg font-medium">
              Culto
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Igreja
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}