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
      <div className="pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:pb-0">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="mx-auto flex min-h-screen max-w-[96rem] gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <aside className="hidden w-60 shrink-0 print:hidden lg:block">
            <div className="sticky top-4 space-y-6">
              <Link className="flex items-center gap-3 px-2" href="/">
                <span className="bg-accent flex size-11 items-center justify-center rounded-xl text-base font-black text-white">
                  ¢¢
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold tracking-tight">
                    2cents
                  </span>
                  <span className="text-muted block text-sm">
                    Local-first budgeting
                  </span>
                </span>
              </Link>

              <div className="flex flex-wrap gap-2 px-2">
                <Badge variant="accent">Installed-ready</Badge>
                <Badge variant="outline">Offline-first</Badge>
              </div>

              <AppNavigation orientation="desktop" />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="print:hidden lg:hidden">
              <div className="bg-canvas/92 border-line/70 sticky top-0 z-20 -mx-4 flex items-center justify-between gap-4 border-b px-4 pb-4 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="bg-accent flex size-10 items-center justify-center rounded-xl text-sm font-black text-white">
                    ¢¢
                  </span>
                  <div>
                    <p className="text-base font-semibold tracking-tight">2cents</p>
                    <p className="text-muted text-sm">Local-first budgeting</p>
                  </div>
                </div>
                <Badge variant="accent">PWA</Badge>
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
