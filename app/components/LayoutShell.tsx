"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import BottomNav from "./BottomNav";
import ReminderController from "./ReminderController";
import { supabase } from "../lib/supabase";

// Rotas que podem ser abertas sem uma conta conectada.
const PUBLIC_ROUTES = ["/login"];

type AuthState = "checking" | "authenticated" | "anonymous";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const [authState, setAuthState] = useState<AuthState>("checking");

  // Acompanha a sessão do Supabase (login, logout e renovação do token).
  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        setAuthState(!error && data.session ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (active) setAuthState("anonymous");
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setAuthState(session ? "authenticated" : "anonymous");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sem sessão: vai para o login. Com sessão no login: vai para o início.
  useEffect(() => {
    if (authState === "anonymous" && !isPublicRoute) {
      router.replace("/login");
    }

    if (authState === "authenticated" && isPublicRoute) {
      router.replace("/");
    }
  }, [authState, isPublicRoute, router]);

  const waitingForRedirect =
    authState === "checking" ||
    (authState === "anonymous" && !isPublicRoute) ||
    (authState === "authenticated" && isPublicRoute);

  // Nenhuma página privada é renderizada (nem carrega dados) sem sessão.
  if (waitingForRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-400">
        <p role="status" className="text-sm">
          Verificando sua sessão...
        </p>
      </div>
    );
  }

  if (isPublicRoute) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <>
      <div className="min-h-screen pt-16">{children}</div>
      <BottomNav />
      <ReminderController />
    </>
  );
}
