"use client";

import { useState } from "react";

import { usePwa } from "@/components/providers/pwa-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PwaStatusBanner() {
  const pwa = usePwa();
  const [offlineReadyDismissed, setOfflineReadyDismissed] = useState(false);

  if (pwa.isUpdateReady) {
    return (
      <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-30 print:hidden lg:bottom-6 lg:left-auto lg:right-6 lg:w-[24rem]">
        <Card className="border-accent/25" variant="elevated">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-ink text-sm font-semibold tracking-tight">
                An update is ready
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                Reload once to activate the newest cached app shell and assets.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={pwa.reloadForUpdate} size="sm" variant="primary">
                Reload now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pwa.canInstall) {
    return (
      <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-30 print:hidden lg:bottom-6 lg:left-auto lg:right-6 lg:w-[24rem]">
        <Card className="border-line/90" variant="elevated">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-ink text-sm font-semibold tracking-tight">
                Install 2cents
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                Add 2cents to your home screen for standalone access and offline
                reopen support after the first production load.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void pwa.promptInstall()} size="sm" variant="primary">
                Install app
              </Button>
              <Button
                onClick={pwa.dismissInstallPrompt}
                size="sm"
                variant="secondary"
              >
                Not now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pwa.isOfflineReady && !offlineReadyDismissed) {
    return (
      <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-30 print:hidden lg:bottom-6 lg:left-auto lg:right-6 lg:w-[24rem]">
        <Card className="border-success/20" variant="elevated">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-ink text-sm font-semibold tracking-tight">
                Offline shell is ready
              </p>
              <p className="text-muted mt-1 text-sm leading-6">
                The current app shell and static assets are cached. Existing
                local IndexedDB data will remain available when the network
                drops.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setOfflineReadyDismissed(true)}
                size="sm"
                variant="secondary"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
