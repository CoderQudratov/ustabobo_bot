"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

const SHOW_NAV_PATHS = ["/", "/my-orders", "/new-order", "/wallet"];

function shouldShowNav(pathname: string): boolean {
  if (pathname === "/") return true;
  return SHOW_NAV_PATHS.some((p) => pathname.startsWith(p) && (p === "/" || pathname === p || pathname.startsWith(p + "/")));
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
