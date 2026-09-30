"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Link2, Settings } from "lucide-react";

const tabs = [
  { href: "/", label: "Schedule", icon: CalendarDays },
  { href: "/link", label: "Link", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.06] bg-[#0a0e17]/95 backdrop-blur-2xl safe-area-bottom">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-all duration-200 ${
                isActive ? "text-blue-400" : "text-slate-500"
              }`}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute top-0 h-[2px] w-8 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 shadow-sm shadow-blue-400/50" />
              )}

              <tab.icon
                className={`size-5 transition-all duration-200 ${
                  isActive
                    ? "text-blue-400 scale-110"
                    : "text-slate-500 group-hover:text-slate-300 group-active:scale-90"
                }`}
              />
              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                  isActive
                    ? "text-blue-400"
                    : "text-slate-600 group-hover:text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
