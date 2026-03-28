"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppNavigationProps = {
  className?: string;
  orientation: "desktop" | "mobile";
};

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function AppNavigation({ className, orientation }: AppNavigationProps) {
  const pathname = usePathname();

  if (orientation === "mobile") {
    return (
      <nav
        aria-label="Primary"
        className={cn(
          "border-line/80 bg-panel/96 fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 rounded-2xl border p-2 shadow-[0_18px_36px_-26px_rgba(31,27,22,0.35)] backdrop-blur print:hidden lg:hidden",
          className,
        )}
      >
        <ul className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);

            return (
              <li className="min-w-[80px] flex-1" key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-center text-[0.7rem] font-semibold transition",
                    active
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-panel-strong/55 hover:text-accent-strong",
                  )}
                  href={item.href}
                >
                  <Icon className="size-4" strokeWidth={2.1} />
                  <span>{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Primary"
      className={cn("print:hidden", className)}
    >
      <p className="text-muted px-3 text-xs font-semibold uppercase tracking-[0.18em]">
        Workspace
      </p>
      <ul className="mt-2 space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-accent-soft text-accent-strong"
                    : "text-muted hover:bg-panel hover:text-ink",
                )}
                href={item.href}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    active
                      ? "border-accent/20 bg-white text-accent-strong"
                      : "border-transparent bg-transparent text-muted",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={2.1} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
