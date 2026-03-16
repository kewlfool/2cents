import { FeatureRouteShell } from "@/components/layout/feature-route-shell";

export function SettingsPreview() {
  return (
    <FeatureRouteShell
      deferred={[
        "Cloud sync or remote backups",
        "Telemetry or analytics collection",
        "Fake encryption claims before real implementation exists",
      ]}
      dependencies={[
        "Local data export and import services",
        "App settings schema and storage",
        "PWA update and offline-cache behavior",
      ]}
      description="Settings will make local-only behavior obvious, expose data portability controls, and keep privacy language as concrete as the product behavior."
      highlights={[
        { label: "Target phase", value: "Phases 8-9" },
        { label: "Default stance", value: "Local only" },
        { label: "Recovery path", value: "JSON backup" },
      ]}
      inScope={[
        "Currency and month-start preferences.",
        "Export and import of app data as a JSON backup artifact.",
        "Reset actions, privacy explanation, and future-flag entry points without shipping hidden services.",
      ]}
      phaseLabel="Phases 8-9: settings and PWA"
      title="Settings"
    />
  );
}
