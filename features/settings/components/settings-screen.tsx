"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { usePwa } from "@/components/providers/pwa-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { List, ListRow } from "@/components/ui/list";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { exportAppData, importAppData, resetAppData } from "@/db";
import { useSettingsWorkspace } from "@/features/settings/hooks/use-settings-workspace";
import {
  createSettingsPreferencesFormValues,
  settingsPreferencesFormSchema,
  type SettingsPreferencesFormValues,
} from "@/features/settings/lib/settings-form";
import { saveAppPreferences } from "@/features/settings/lib/settings-service";
import { withBasePath } from "@/lib/base-path";
import { formatMonthKeyLabel } from "@/lib/date";
import { cn } from "@/lib/utils";

type ScreenMessage = {
  body: string;
  tone: "error" | "success";
};

const monthStartOptions = Array.from({ length: 28 }, (_, index) => index + 1);

function downloadJsonFile(content: string, fileName: string) {
  const blob = new Blob([content], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function createBackupFileName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `2cents-backup-${timestamp}.json`;
}

function SummaryMetric(props: {
  caption: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line/70 bg-panel/96 space-y-1 rounded-xl border px-4 py-3">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <p className="text-ink text-xl font-semibold tracking-tight">
        {props.value}
      </p>
      <p className="text-muted text-sm leading-5">{props.caption}</p>
    </div>
  );
}

export function SettingsScreen() {
  const bootstrap = useAppBootstrap();
  const pwa = usePwa();
  const workspace = useSettingsWorkspace();
  const [message, setMessage] = useState<ScreenMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [reseedDemoData, setReseedDemoData] = useState(true);
  const [backupInputKey, setBackupInputKey] = useState(0);

  const form = useForm<SettingsPreferencesFormValues>({
    defaultValues: createSettingsPreferencesFormValues(),
    resolver: zodResolver(settingsPreferencesFormSchema),
  });

  useEffect(() => {
    if (!workspace) {
      return;
    }

    form.reset(
      createSettingsPreferencesFormValues({
        currency:
          workspace.settings?.currency ?? workspace.budgetPlan?.currency ?? "USD",
        monthStartDay:
          workspace.settings?.monthStartDay ??
          workspace.budgetPlan?.monthStartDay ??
          1,
      }),
    );
  }, [form, workspace]);

  async function handleExport() {
    setIsExporting(true);
    setMessage(null);

    try {
      const backup = await exportAppData();
      downloadJsonFile(
        JSON.stringify(backup, null, 2),
        createBackupFileName(),
      );
      setMessage({
        body: "Exported a local JSON backup of this device's data.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to export the local backup.",
        tone: "error",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportBackup(file: File | null) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage(null);

    try {
      const rawText = await file.text();
      const parsedBackup = JSON.parse(rawText);

      if (
        !window.confirm(
          "Import this backup? All current local data on this browser will be replaced.",
        )
      ) {
        setBackupInputKey((currentValue) => currentValue + 1);
        return;
      }

      await importAppData(parsedBackup);
      setMessage({
        body: `Imported ${file.name} and replaced the current local dataset.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to import the selected backup file.",
        tone: "error",
      });
    } finally {
      setIsImporting(false);
      setBackupInputKey((currentValue) => currentValue + 1);
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        reseedDemoData
          ? "Reset all local data and reseed the demo workspace?"
          : "Clear all local data from this browser?",
      )
    ) {
      return;
    }

    setIsResetting(true);
    setMessage(null);

    try {
      await resetAppData({
        reseedDemoData,
      });
      setMessage({
        body: reseedDemoData
          ? "Reset the local workspace and reloaded demo data."
          : "Cleared all local data from this browser.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to reset the local workspace.",
        tone: "error",
      });
    } finally {
      setIsResetting(false);
    }
  }

  const handleSavePreferences = form.handleSubmit(async (values) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const normalizedValues = {
        ...values,
        currency: values.currency.toUpperCase(),
      };
      const result = await saveAppPreferences(normalizedValues);
      setMessage({
        body: `Saved local preferences for ${result.settings.currency} with a day ${result.settings.monthStartDay} month start.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        body:
          error instanceof Error
            ? error.message
            : "Unable to save local preferences.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  });

  if (bootstrap.status === "booting" || !workspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge={<Badge variant="accent">Settings loading</Badge>}
          description="Preparing local preferences, backup controls, and privacy details from IndexedDB."
          eyebrow="Settings"
          title="Settings"
        />
        <Card>
          <CardContent className="text-muted p-6 text-sm leading-6">
            Loading the local settings workspace from IndexedDB.
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolvedCurrency =
    workspace.settings?.currency ?? workspace.budgetPlan?.currency ?? "USD";
  const resolvedMonthStartDay =
    workspace.settings?.monthStartDay ?? workspace.budgetPlan?.monthStartDay ?? 1;
  const exampleFiles = [
    {
      description:
        "Generic statement template using date, merchant, amount, and notes.",
      href: withBasePath("/examples/2cents-statement-template.csv"),
      label: "Statement CSV",
    },
    {
      description:
        "Bank-style statement example matching split description and CAD headers.",
      href: withBasePath("/examples/2cents-statement-bank-style-example.csv"),
      label: "Bank-style CSV",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badge={<Badge variant="accent">Settings live</Badge>}
        description="Control local-only preferences, data portability, install state, and privacy without turning the settings page into another dashboard."
        eyebrow="Settings"
        title="Settings"
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          caption="Current display and export currency."
          label="Currency"
          value={resolvedCurrency}
        />
        <SummaryMetric
          caption="Transactions before this day count toward the prior month."
          label="Month start"
          value={`Day ${resolvedMonthStartDay}`}
        />
        <SummaryMetric
          caption="Locally stored transactions in this browser."
          label="Transactions"
          value={String(workspace.counts.transactions)}
        />
        <SummaryMetric
          caption="Latest available monthly snapshot."
          label="Latest month"
          value={
            workspace.latestMonthKey
              ? formatMonthKeyLabel(
                  workspace.latestMonthKey,
                  workspace.settings?.locale ?? "en-US",
                  resolvedMonthStartDay,
                )
              : "None yet"
          }
        />
      </section>

      {message ? (
        <Notice tone={message.tone}>
          {message.body}
        </Notice>
      ) : null}

      {bootstrap.errorMessage ? (
        <Notice tone="warning">
          {bootstrap.errorMessage}
        </Notice>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="grid gap-4">
          <Card variant="elevated">
            <CardHeader className="border-b border-line/60">
              <CardTitle>Local preferences</CardTitle>
              <CardDescription>
                These values stay on this device. Month-start changes also
                recalculate which month each saved transaction belongs to.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSavePreferences();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-ink block text-sm font-semibold"
                      htmlFor="settings-currency"
                    >
                      Currency code
                    </label>
                    <Input
                      autoCapitalize="characters"
                      id="settings-currency"
                      maxLength={3}
                      placeholder="USD"
                      {...form.register("currency")}
                    />
                    {form.formState.errors.currency ? (
                      <p className="text-warning text-sm">
                        {form.formState.errors.currency.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-ink block text-sm font-semibold"
                      htmlFor="settings-month-start"
                    >
                      Month start day
                    </label>
                    <Select
                      id="settings-month-start"
                      {...form.register("monthStartDay", {
                        setValueAs: (value) => Number(value),
                      })}
                    >
                      {monthStartOptions.map((day) => (
                        <option key={day} value={day}>
                          Day {day}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button disabled={isSaving} type="submit" variant="primary">
                    {isSaving ? "Saving..." : "Save preferences"}
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={() =>
                      form.reset(
                        createSettingsPreferencesFormValues({
                          currency: resolvedCurrency,
                          monthStartDay: resolvedMonthStartDay,
                        }),
                      )
                    }
                    variant="secondary"
                  >
                    Reset form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Backup and restore</CardTitle>
              <CardDescription>
                Keep portability explicit. Export the full local dataset as JSON
                or replace this browser&apos;s data with a prior backup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <List>
                <ListRow className="items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-ink text-sm font-semibold">
                      Export current local dataset
                    </p>
                    <p className="text-muted text-sm leading-5">
                      Download a JSON backup for this browser only.
                    </p>
                  </div>
                  <Button
                    disabled={isExporting}
                    onClick={() => void handleExport()}
                    variant="primary"
                  >
                    {isExporting ? "Exporting..." : "Export JSON backup"}
                  </Button>
                </ListRow>
                <ListRow className="flex-col gap-3">
                  <div className="space-y-1">
                    <label
                      className="text-ink block text-sm font-semibold"
                      htmlFor="settings-backup-import"
                    >
                      Import JSON backup
                    </label>
                    <p className="text-muted text-sm leading-5">
                      Import replaces the current local IndexedDB dataset for
                      this browser.
                    </p>
                  </div>
                  <Input
                    accept=".json,application/json"
                    disabled={isImporting}
                    id="settings-backup-import"
                    key={backupInputKey}
                    onChange={(event) =>
                      void handleImportBackup(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                </ListRow>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Example statement files</CardTitle>
              <CardDescription>
                Download sample files for manual import testing.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <List>
                {exampleFiles.map((file) => (
                  <ListRow className="items-center justify-between gap-4" key={file.href}>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink text-sm font-semibold">{file.label}</p>
                      <p className="text-muted text-sm leading-5">
                        {file.description}
                      </p>
                    </div>
                    <a
                      className={cn(
                        buttonVariants({
                          size: "sm",
                          variant: "secondary",
                        }),
                      )}
                      download
                      href={file.href}
                    >
                      Download
                    </a>
                  </ListRow>
                ))}
              </List>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Install and offline</CardTitle>
              <CardDescription>
                PWA support depends on production builds and browser capability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={pwa.isInstalled ? "accent" : "outline"}>
                  {pwa.isInstalled ? "Installed" : "Browser tab"}
                </Badge>
                <Badge
                  variant={
                    pwa.runtimeMode === "production" ? "accent" : "default"
                  }
                >
                  {pwa.runtimeMode === "production"
                    ? "PWA runtime active"
                    : "Development mode"}
                </Badge>
                {pwa.isOfflineReady ? (
                  <Badge variant="accent">Offline shell cached</Badge>
                ) : null}
                {pwa.isUpdateReady ? (
                  <Badge variant="warning">Update ready</Badge>
                ) : null}
              </div>

              <List>
                <ListRow className="flex-col gap-1">
                  <p className="text-ink text-sm font-semibold">Current runtime</p>
                  <p className="text-muted text-sm leading-5">
                    {pwa.runtimeMode === "production"
                      ? "Installability and offline caching are active in this build."
                      : "PWA registration is intentionally disabled in development. Use a production preview build to verify install and offline behavior."}
                  </p>
                </ListRow>
                <ListRow className="flex-col gap-1">
                  <p className="text-ink text-sm font-semibold">Platform guidance</p>
                  <p className="text-muted text-sm leading-5">
                    {pwa.platformHint === "ios"
                      ? "On iPhone and iPad, install from Safari using Share > Add to Home Screen."
                      : pwa.canInstall
                        ? "This browser can show a direct install prompt."
                        : "If your browser supports installation, the shell will surface an install prompt when it becomes available."}
                  </p>
                </ListRow>
              </List>

              <div className="flex flex-wrap gap-3">
                {pwa.canInstall ? (
                  <Button
                    onClick={() => void pwa.promptInstall()}
                    size="sm"
                    variant="primary"
                  >
                    Install 2cents
                  </Button>
                ) : null}
                {pwa.isUpdateReady ? (
                  <Button
                    onClick={pwa.reloadForUpdate}
                    size="sm"
                    variant="secondary"
                  >
                    Reload for update
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Privacy</CardTitle>
              <CardDescription>
                The app is local-first by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <List>
                <ListRow className="flex-col gap-1">
                  <p className="text-ink text-sm font-semibold">Local storage</p>
                  <p className="text-muted text-sm leading-5">
                    Imported statements, transactions, rules, and snapshots stay
                    in this browser unless you explicitly export them.
                  </p>
                </ListRow>
                <ListRow className="flex-col gap-1">
                  <p className="text-ink text-sm font-semibold">No hidden services</p>
                  <p className="text-muted text-sm leading-5">
                    There are no external analytics, ads, AI calls, or financial
                    data uploads in the current product.
                  </p>
                </ListRow>
                <ListRow className="flex-col gap-1">
                  <p className="text-ink text-sm font-semibold">Portable by export</p>
                  <p className="text-muted text-sm leading-5">
                    Backup import and export are the only built-in data
                    portability features in v1.
                  </p>
                </ListRow>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-line/60">
              <CardTitle>Current local footprint</CardTitle>
              <CardDescription>
                What is currently stored on this browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <List>
                <ListRow className="flex-col gap-1">
                  <p className="text-ink text-sm font-semibold">Saved records</p>
                  <p className="text-muted text-sm leading-5">
                    {workspace.counts.imports} imports, {workspace.counts.rules} rules,
                    and {workspace.counts.months} monthly snapshots are stored on
                    this browser.
                  </p>
                </ListRow>
                <ListRow className="flex-col gap-1">
                  <p className="text-ink text-sm font-semibold">Future scope</p>
                  <p className="text-muted text-sm leading-5">
                    Future flags stay explicit here, but cloud sync and remote
                    backup remain out of scope for v1.
                  </p>
                </ListRow>
              </List>
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardHeader className="border-b border-line/60">
              <CardTitle>Reset local data</CardTitle>
              <CardDescription>
                Use this when you want to start fresh on this browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <label className="border-line/70 bg-panel flex items-start gap-3 rounded-xl border px-4 py-3">
                <input
                  aria-label="Reseed demo data after reset"
                  checked={reseedDemoData}
                  className="border-line text-accent focus:ring-accent mt-1 size-4 rounded border"
                  onChange={(event) => setReseedDemoData(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="text-ink block text-sm font-semibold">
                    Reseed demo data after reset
                  </span>
                  <span className="text-muted block text-sm leading-6">
                    Keep the app usable immediately after a reset instead of
                    leaving the local workspace empty.
                  </span>
                </span>
              </label>

              <Button
                className="border-warning/30 text-warning hover:border-warning/40 hover:bg-orange-50"
                disabled={isResetting}
                onClick={() => void handleReset()}
                variant="secondary"
              >
                {isResetting ? "Resetting..." : "Reset local data"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
