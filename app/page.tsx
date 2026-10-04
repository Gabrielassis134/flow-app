import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">

        {/* Cabeçalho */}
        <header className="flex items-center justify-between">
          <Link href="/">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Flow
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Organize sua rotina. Viva seu tempo.
              </p>
            </div>
          </Link>

          <Link
            href="/configuracoes"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Configurações
          </Link>
        </header>

        {/* Saudação */}
        <section className="mt-12">
          <p className="text-sm text-zinc-400">
            Domingo, 4 de outubro
          </p>

          <h2 className="mt-2 text-4xl font-semibold tracking-tight">
            Boa tarde 👋
          </h2>

          <p className="mt-3 max-w-xl text-zinc-400">
            Aqui está um resumo do que está acontecendo com você hoje.
          </p>
        </section>

        {/* Próxima atividade */}
        <section className="mt-10">
          <Link href="/agenda">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl transition hover:border-zinc-700 hover:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">
                    Próxima atividade
                  </p>

                  <h3 className="mt-2 text-2xl font-medium">
                    Ensaio na igreja
                  </h3>

                  <p className="mt-2 text-sm text-zinc-400">
                    Hoje · 17:00 – 18:30
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-800 px-4 py-3 text-center">
                  <p className="text-xs text-zinc-400">
                    Em
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    3h
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Resumo */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">

          {/* Agenda */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Hoje
              </h3>

              <Link
                href="/agenda"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Ver agenda
              </Link>
            </div>

            <div className="mt-5 space-y-4">

              <div className="flex gap-4">
                <div className="w-14 text-sm text-zinc-500">
                  17:00
                </div>

                <div className="flex-1 rounded-2xl bg-zinc-800/70 p-4">
                  <p className="font-medium">
                    Ensaio na igreja
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Igreja
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-14 text-sm text-zinc-500">
                  19:00
                </div>

                <div className="flex-1 rounded-2xl bg-zinc-800/70 p-4">
                  <p className="font-medium">
                    Culto
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Igreja
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Tarefas */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Tarefas
              </h3>

              <Link
                href="/tarefas"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                Ver todas
              </Link>
            </div>

            <div className="mt-5 space-y-3">

              <div className="flex items-center gap-3 rounded-2xl bg-zinc-800/70 p-4">
                <div className="h-5 w-5 rounded-full border border-zinc-600" />

                <div>
                  <p className="font-medium">
                    Estudar Física
                  </p>

                  <p className="text-sm text-zinc-400">
                    1h30 · Alta prioridade
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-zinc-800/70 p-4">
                <div className="h-5 w-5 rounded-full border border-zinc-600" />

                <div>
                  <p className="font-medium">
                    Projeto de robótica
                  </p>

                  <p className="text-sm text-zinc-400">
                    2h · Média prioridade
                  </p>
                </div>
              </div>

            </div>
          </div>

        </section>
      
      </div>
    </main>
  );
}