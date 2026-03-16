import Link from "next/link";
import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";
import { PwaStatusBanner } from "@/components/layout/pwa-status-banner";
import { AppBootstrapProvider } from "@/components/providers/app-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <AppBootstrapProvider>
      <div className="pb-24 lg:pb-0">
        <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <aside className="hidden w-80 shrink-0 print:hidden lg:block">
            <div className="sticky top-4 space-y-4">
              <Card className="overflow-hidden">
                <CardContent className="space-y-5 p-6">
                  <Link className="flex items-center gap-4" href="/">
                    <span className="bg-accent flex size-14 items-center justify-center rounded-[22px] text-xl font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                      ¢¢
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold tracking-tight">
                        2cents
                      </span>
                      <span className="text-muted block text-sm">
                        Local-first budgeting and reconciliation
                      </span>
                    </span>
                  </Link>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="accent">PWA ready</Badge>
                    <Badge variant="outline">Offline shell</Badge>
                  </div>

                  <div className="border-line/80 bg-panel-strong/45 text-muted rounded-[24px] border p-4 text-sm leading-6">
                    Budgeting, imports, rules, reviews, backups, and the
                    transaction ledger now run fully from local IndexedDB, with
                    installability and offline shell caching layered on top.
                  </div>
                </CardContent>
              </Card>

              <AppNavigation orientation="desktop" />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="print:hidden lg:hidden">
              <Card>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="bg-accent flex size-11 items-center justify-center rounded-[18px] text-base font-black text-white">
                      ¢¢
                    </span>
                    <div>
                      <p className="text-base font-semibold tracking-tight">
                        2cents
                      </p>
                      <p className="text-muted text-sm">
                        Local-first budgeting PWA
                      </p>
                    </div>
                  </div>
                  <Badge variant="accent">PWA</Badge>
                </CardContent>
              </Card>
            </div>

            <main className="flex-1">{children}</main>
          </div>
        </div>

        <AppNavigation className="print:hidden lg:hidden" orientation="mobile" />
        <PwaStatusBanner />
      </div>
    </AppBootstrapProvider>
  );
}
