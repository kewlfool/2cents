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
          "border-line/85 bg-panel/97 fixed inset-x-[var(--space-page-tight)] bottom-[calc(env(safe-area-inset-bottom)+var(--mobile-dock-gap))] z-20 rounded-[var(--radius-dock)] border px-1.5 py-1 shadow-[var(--shadow-floating)] backdrop-blur print:hidden lg:hidden",
          className,
        )}
      >
        <ul className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);

            return (
              <li className="min-w-[70px] flex-1" key={item.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[var(--control-height-sm)] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] px-1.5 py-1.5 text-center text-[0.65rem] font-medium transition",
                    active
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-panel-strong/45 hover:text-accent-strong",
                  )}
                  href={item.href}
                >
                  <Icon className="size-[15px]" strokeWidth={2.1} />
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
      <p className="text-muted px-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]">
        Workspace
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-accent-soft text-accent-strong"
                    : "text-muted hover:bg-panel hover:text-ink",
                )}
                href={item.href}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-[calc(var(--radius-control)-0.15rem)] border",
                    active
                      ? "border-accent/20 bg-white text-accent-strong"
                      : "border-transparent bg-transparent text-muted",
                  )}
                >
                  <Icon className="size-4" strokeWidth={2.1} />
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
