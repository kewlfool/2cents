import { FeatureRouteShell } from "@/components/layout/feature-route-shell";

export function RulesPreview() {
  return (
    <FeatureRouteShell
      deferred={[
        "AI-assisted categorization suggestions",
        "External merchant enrichment services",
        "Automatic recategorization of historical data without review",
      ]}
      dependencies={[
        "Merchant normalization helpers",
        "Stored categories and transactions",
        "Rule priority and rule-match explanation utilities",
      ]}
      description="Merchant rules will give users explicit control over categorization, preserve trust with visible match previews, and never rewrite history behind the scenes."
      highlights={[
        { label: "Target phase", value: "Phase 5" },
        { label: "Match modes", value: "4 strategies" },
        { label: "Trust rule", value: "No silent changes" },
      ]}
      inScope={[
        "Exact, contains, startsWith, and regex merchant rules with explicit priorities.",
        "Create, edit, delete, and test rule behavior against sample merchant names.",
        "Save user corrections as reusable rules and re-run categorization for uncategorized transactions.",
      ]}
      phaseLabel="Phase 5: merchant rules"
      title="Rules"
    />
  );
}
