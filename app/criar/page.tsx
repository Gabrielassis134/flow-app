import Link from "next/link";

export default function Criar() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-8">

        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Voltar
        </Link>

        <h1 className="mt-8 text-3xl font-semibold">
          Criar
        </h1>

        <p className="mt-2 text-zinc-400">
          O que você deseja adicionar?
        </p>

        <div className="mt-8 grid gap-4">

          <button className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left transition hover:bg-zinc-800">
            <h2 className="text-lg font-medium">
              Nova tarefa
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Adicione algo que precisa ser feito.
            </p>
          </button>

          <button className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left transition hover:bg-zinc-800">
            <h2 className="text-lg font-medium">
              Novo compromisso
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Adicione algo que já possui horário definido.
            </p>
          </button>

          <button className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-left transition hover:bg-zinc-800">
            <h2 className="text-lg font-medium">
              Atividade de grupo
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Crie uma atividade envolvendo outras pessoas.
            </p>
          </button>

        </div>

      </div>
    </main>
  );
}