import Link from "next/link";

export default function Grupos() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Flow
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Grupos
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
          >
            Início
          </Link>
        </header>

        <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-medium">
            Meus grupos
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            Seus grupos aparecerão aqui.
          </p>

          <button className="mt-6 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900">
            + Criar grupo
          </button>
        </div>

      </div>
    </main>
  );
}