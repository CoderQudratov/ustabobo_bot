"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

function shouldShowNav(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/my-orders")) return true;
  if (pathname.startsWith("/orders")) return true;
  if (pathname.startsWith("/new-order")) return true;
  if (pathname.startsWith("/wallet")) return true;
  return false;
}

export function WebAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname ?? "");

  return (
    <>
      <div
        className="min-h-screen"
        style={{
          paddingBottom: showNav ? "calc(60px + env(safe-area-inset-bottom, 0px))" : undefined,
        }}
      >
        {children}
      </div>
      {showNav && <BottomNav />}
    </>
  );
}
