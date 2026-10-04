import Link from "next/link";

export default function Configuracoes() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-8">

        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Voltar
        </Link>

        <h1 className="mt-8 text-3xl font-semibold">
          Configurações
        </h1>

        <div className="mt-8 space-y-3">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-medium">
              Aparência
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Tema claro, escuro e automático.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-medium">
              Notificações
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Configure seus lembretes e notificações.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-medium">
              Privacidade
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Controle quem pode acessar suas informações.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}