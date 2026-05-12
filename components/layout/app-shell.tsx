import Link from "next/link";
import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";
import { PwaStatusBanner } from "@/components/layout/pwa-status-banner";
import { AppBootstrapProvider } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <AppBootstrapProvider>
      <div className="pb-[calc(env(safe-area-inset-bottom)+var(--mobile-dock-offset))] lg:pb-0">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="mx-auto flex min-h-screen max-w-[108rem] gap-[var(--space-page)] px-[var(--space-page-tight)] py-[var(--space-page-tight)] sm:px-[var(--space-page)] lg:px-[var(--space-page-wide)]">
          <aside className="hidden w-52 shrink-0 print:hidden lg:block">
            <div className="sticky top-[var(--space-page-tight)] space-y-[var(--space-stack)]">
              <Link className="flex items-center gap-2.5 px-1" href="/">
                <span className="bg-accent flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-sm font-black text-white">
                  ¢¢
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-semibold tracking-tight">
                    2cents
                  </span>
                  <span className="text-muted block text-xs">
                    Budget workspace
                  </span>
                </span>
              </Link>

              <div className="flex flex-wrap gap-1.5 px-1">
                <Badge variant="accent">Installed</Badge>
                <Badge variant="outline">Offline-first</Badge>
              </div>

              <AppNavigation orientation="desktop" />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-page-wide)]">
            <div className="print:hidden lg:hidden">
              <div className="bg-canvas/94 border-line/70 sticky top-0 z-20 -mx-[var(--space-page-tight)] flex items-center justify-between gap-3 border-b px-[var(--space-page-tight)] py-2.5 backdrop-blur sm:-mx-[var(--space-page)] sm:px-[var(--space-page)]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-accent flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-xs font-black text-white">
                    ¢¢
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      2cents
                    </p>
                    <p className="text-muted truncate text-xs">Budget workspace</p>
                  </div>
                </div>
                <Badge variant="accent">Offline</Badge>
              </div>
            </div>

            <main className="flex-1 outline-none" id="main-content" tabIndex={-1}>
              {children}
            </main>
          </div>
        </div>

        <AppNavigation className="print:hidden lg:hidden" orientation="mobile" />
        <PwaStatusBanner />
      </div>
    </AppBootstrapProvider>
  );
}
