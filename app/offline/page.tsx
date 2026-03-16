import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <Badge variant="accent">Offline</Badge>
          <CardTitle>2cents is offline</CardTitle>
          <CardDescription>
            The app shell is cached, but this route was not available from the
            network. Reopen a saved workspace route to continue reviewing local
            IndexedDB data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6">
          <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
            Existing budget plans, transactions, rules, imports, and monthly
            snapshots remain on this device.
          </div>
          <div className="border-line/70 bg-panel-strong/35 rounded-[24px] border px-4 py-4">
            Browser support differs: iPhone Safari can install from the Share
            menu, while Chromium browsers can also show a direct install prompt.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
