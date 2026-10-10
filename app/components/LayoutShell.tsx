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
      <div className={isLoginPage ? "" : "pb-24"}>{children}</div>

      {!isLoginPage && <BottomNav />}
    </>
  );
}
