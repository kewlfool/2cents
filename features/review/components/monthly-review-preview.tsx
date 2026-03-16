import { FeatureRouteShell } from "@/components/layout/feature-route-shell";

export function MonthlyReviewPreview() {
  return (
    <FeatureRouteShell
      deferred={[
        "Forecasting and forward-looking cash-flow predictions",
        "Heavy charting where data is sparse",
        "Automated anomaly scoring",
      ]}
      dependencies={[
        "Stable category mappings and transaction storage",
        "Pure calculation utilities for planned versus actual totals",
        "Month-start preference and summary rollup logic",
      ]}
      description="Monthly review will turn imported activity and the planned baseline into a trustworthy comparison of spending, category variance, and actual savings."
      highlights={[
        { label: "Target phase", value: "Phase 6" },
        { label: "Primary output", value: "Planned vs actual" },
        { label: "Secondary output", value: "Print-friendly review" },
      ]}
      inScope={[
        "Month picker with category-level planned, actual, and variance values.",
        "Expandable category rows that expose the underlying transactions.",
        "A print-safe monthly review layout for quick household reconciliation.",
      ]}
      phaseLabel="Phase 6: monthly review"
      title="Monthly review"
    />
  );
}
