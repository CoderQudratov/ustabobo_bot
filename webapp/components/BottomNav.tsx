"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Asosiy", icon: "🏠" },
  { href: "/orders/active", label: "Buyurtma", icon: "📋" },
  { href: "/new-order", label: "Yangi", icon: "➕" },
  { href: "/wallet", label: "Profil", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="webapp-bottom-nav fixed bottom-0 left-0 right-0 z-30 flex h-[60px] items-center justify-around border-t border-[var(--border)] bg-[var(--surface)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      {navItems.map(({ href, label, icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 py-2 min-w-[64px] rounded-lg transition-colors"
            style={{
              color: active ? "var(--primary)" : "var(--text-2)",
              fontWeight: active ? 700 : 400,
            }}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
