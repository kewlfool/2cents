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
          "border-line/80 bg-panel/95 fixed inset-x-4 bottom-4 z-20 rounded-[28px] border p-2 shadow-[0_24px_60px_-35px_rgba(31,27,22,0.55)] backdrop-blur print:hidden lg:hidden",
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
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-3 text-center text-[0.7rem] font-semibold transition",
                    active
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-accent-soft hover:text-accent-strong",
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
      className={cn(
        "border-line/80 bg-panel/90 rounded-[30px] border p-3 shadow-[0_24px_80px_-48px_rgba(31,27,22,0.5)] backdrop-blur print:hidden",
        className,
      )}
    >
      <ul className="space-y-1.5">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-[24px] px-4 py-3 transition",
                  active
                    ? "bg-accent text-white"
                    : "text-ink hover:bg-accent-soft/80",
                )}
                href={item.href}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border",
                    active
                      ? "border-white/20 bg-white/10"
                      : "border-line bg-panel-strong/50 text-accent-strong",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={2.1} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-sm leading-5",
                      active ? "text-white/75" : "text-muted",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
