"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <>
      <main className={isLoginPage ? "min-h-screen" : "min-h-screen pt-16"}>
        {children}
      </main>

      {!isLoginPage && <BottomNav />}
    </>
  );
}
