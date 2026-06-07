"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/layout/page-header";
import { useAppBootstrap } from "@/components/providers/app-bootstrap-provider";
import { usePwa } from "@/components/providers/pwa-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border-line/70 bg-panel/96 rounded-[var(--radius-panel)] border px-3 py-2">
      <p className="text-muted text-xs font-semibold uppercase tracking-[0.14em]">
        {props.label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-ink text-base font-semibold tracking-tight">
          {props.value}
        </p>
        <p className="text-muted text-right text-[0.75rem] leading-4">
          {props.detail}
        </p>
      </div>
    </div>
  );
}

function WorkspaceSection(props: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
  variant?: "default" | "elevated" | "muted";
}) {
  const variantClass =
    props.variant === "elevated"
      ? "shadow-[var(--shadow-panel)]"
      : props.variant === "muted"
        ? "bg-panel-strong/18"
        : "bg-panel/96";

  return (
    <section
      className={cn(
        "border-line/70 rounded-[var(--radius-panel)] border",
        variantClass,
      )}
    >
      <div className="border-line/60 flex items-start justify-between gap-3 border-b px-[var(--space-card)] py-[var(--space-card-compact)]">
        <div className="min-w-0">
          <h2 className="text-ink text-sm font-semibold tracking-tight">
            {props.title}
          </h2>
          {props.description ? (
            <p className="text-muted mt-1 text-[0.8125rem] leading-5">
              {props.description}
            </p>
          ) : null}
        </div>
        {props.actions ? <div className="shrink-0">{props.actions}</div> : null}
      </div>
      <div className="p-[var(--space-card)]">{props.children}</div>
    </section>
  );
}

function SnapshotRow(props: { label: string; secondary: string; value: ReactNode }) {
  return (
    <ListRow className="items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold tracking-tight">{props.label}</p>
        <p className="text-muted text-[0.75rem] leading-4">{props.secondary}</p>
      </div>
      <div className="text-ink shrink-0 text-right text-sm font-semibold">
        {props.value}
      </div>
    </ListRow>
  );
}

function InfoBlock(props: { body: string }) {
  return (
    <div className="border-line/70 bg-panel text-muted rounded-[var(--radius-control)] border px-3.5 py-3 text-sm leading-5">
      {props.body}
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
  const watchedCurrency = form.watch("currency");
  const watchedMonthStartDay = form.watch("monthStartDay");

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
  const latestMonthLabel = workspace.latestMonthKey
    ? formatMonthKeyLabel(
        workspace.latestMonthKey,
        workspace.settings?.locale ?? "en-US",
        resolvedMonthStartDay,
      )
    : "None yet";
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
    <div className="space-y-5">
      <PageHeader
        badge={<Badge variant="accent">Settings live</Badge>}
        eyebrow="Settings"
        title="Settings"
      />

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          detail="Display"
          label="Currency"
          value={resolvedCurrency}
        />
        <SummaryMetric
          detail="Review cycle"
          label="Month start"
          value={`Day ${resolvedMonthStartDay}`}
        />
        <SummaryMetric
          detail="Browser store"
          label="Transactions"
          value={String(workspace.counts.transactions)}
        />
        <SummaryMetric
          detail="Latest snapshot"
          label="Latest month"
          value={latestMonthLabel}
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

      <section className="grid gap-3.5 xl:grid-cols-[minmax(0,1.12fr)_minmax(21rem,0.88fr)]">
        <div className="grid gap-3.5">
          <WorkspaceSection
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={isSaving}
                  form="settings-preferences-form"
                  type="submit"
                  variant="primary"
                >
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
                  type="button"
                  variant="secondary"
                >
                  Reset
                </Button>
              </div>
            }
            description="Month-start changes rebuild transaction month assignments."
            title="Local preferences"
            variant="elevated"
          >
            <form
              className="space-y-3"
              id="settings-preferences-form"
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
                    <p className="text-warning text-[0.75rem] leading-4">
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
            </form>
          </WorkspaceSection>

          <WorkspaceSection
            description="Export the current browser dataset or replace it with a prior backup."
            title="Backup and files"
          >
            <div className="space-y-3">
              <List>
                <ListRow className="items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-ink text-sm font-semibold">
                      Export dataset
                    </p>
                    <p className="text-muted text-[0.8125rem] leading-5">
                      Download a JSON backup for this browser.
                    </p>
                  </div>
                  <Button
                    disabled={isExporting}
                    onClick={() => void handleExport()}
                    variant="primary"
                  >
                    {isExporting ? "Exporting..." : "Export JSON"}
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
                    <p className="text-muted text-[0.8125rem] leading-5">
                      Import replaces the current local browser dataset.
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
              <div className="space-y-2">
                <p className="text-ink text-sm font-semibold">Example statement files</p>
                <List>
                  {exampleFiles.map((file) => (
                    <ListRow className="items-center justify-between gap-4" key={file.href}>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink text-sm font-semibold">{file.label}</p>
                        <p className="text-muted text-[0.8125rem] leading-5">
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
              </div>
            </div>
          </WorkspaceSection>
        </div>

        <div className="grid gap-3.5 xl:sticky xl:top-[4.5rem] xl:self-start">
          <WorkspaceSection title="Workspace snapshot" variant="muted">
            <List>
              <SnapshotRow
                label="Currency"
                secondary="Current form"
                value={watchedCurrency.toUpperCase()}
              />
              <SnapshotRow
                label="Month start"
                secondary="Current form"
                value={`Day ${watchedMonthStartDay}`}
              />
              <SnapshotRow
                label="Unsaved changes"
                secondary="Preferences form"
                value={form.formState.isDirty ? "Pending" : "Saved"}
              />
              <SnapshotRow
                label="Transactions"
                secondary="Local store"
                value={String(workspace.counts.transactions)}
              />
              <SnapshotRow
                label="Latest month"
                secondary="Snapshot"
                value={latestMonthLabel}
              />
            </List>
          </WorkspaceSection>

          <WorkspaceSection title="Install and offline">
            <div className="space-y-3">
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
                    ? "PWA runtime"
                    : "Development"}
                </Badge>
                {pwa.isOfflineReady ? (
                  <Badge variant="accent">Offline ready</Badge>
                ) : null}
                {pwa.isUpdateReady ? (
                  <Badge variant="warning">Update ready</Badge>
                ) : null}
              </div>

              <List>
                <SnapshotRow
                  label="Runtime"
                  secondary="Current build"
                  value={pwa.runtimeMode === "production" ? "Active" : "Dev"}
                />
                <SnapshotRow
                  label="Install prompt"
                  secondary="Browser support"
                  value={pwa.canInstall ? "Available" : "Unavailable"}
                />
              </List>

              <InfoBlock
                body={
                  pwa.runtimeMode === "production"
                    ? "Installability and offline caching are active in this build."
                    : "PWA registration is disabled in development. Use a production preview build to verify install and offline behavior."
                }
              />
              <InfoBlock
                body={
                  pwa.platformHint === "ios"
                    ? "On iPhone and iPad, install from Safari using Share > Add to Home Screen."
                    : pwa.canInstall
                      ? "This browser can show a direct install prompt."
                      : "If the browser supports installation, the shell will surface a prompt when available."
                }
              />

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
            </div>
          </WorkspaceSection>

          <WorkspaceSection title="Privacy and storage">
            <div className="space-y-3">
              <List>
                <SnapshotRow
                  label="Imports"
                  secondary="Local records"
                  value={String(workspace.counts.imports)}
                />
                <SnapshotRow
                  label="Rules"
                  secondary="Local records"
                  value={String(workspace.counts.rules)}
                />
                <SnapshotRow
                  label="Snapshots"
                  secondary="Local records"
                  value={String(workspace.counts.months)}
                />
              </List>

              <InfoBlock body="Imported statements, transactions, rules, and snapshots stay in this browser unless you explicitly export them." />
              <InfoBlock body="There are no external analytics, ads, AI calls, or financial data uploads in the current product." />
              <InfoBlock body="Backup import and export are the only built-in portability features in v1." />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            description="Use this when you want to start fresh on this browser."
            title="Reset local data"
            variant="muted"
          >
            <div className="space-y-4">
              <label className="border-line/70 bg-panel flex items-start gap-3 rounded-[var(--radius-control)] border px-3.5 py-3">
                <input
                  aria-label="Reseed demo data after reset"
                  checked={reseedDemoData}
                  className="border-line text-accent focus:ring-accent mt-1 size-4 rounded border"
                  onChange={(event) => setReseedDemoData(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="text-ink block text-sm font-semibold">
                    Reseed demo data
                  </span>
                  <span className="text-muted block text-[0.8125rem] leading-5">
                    Keep the app usable immediately after reset.
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
            </div>
          </WorkspaceSection>
        </div>
      </section>
    </div>
  );
}
