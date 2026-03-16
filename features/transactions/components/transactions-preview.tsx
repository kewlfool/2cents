import { FeatureRouteShell } from "@/components/layout/feature-route-shell";

export function TransactionsPreview() {
  return (
    <FeatureRouteShell
      deferred={[
        "Receipt attachments",
        "Recurring automation",
        "Split transactions in the first release",
      ]}
      dependencies={[
        "Imported and manual transaction persistence",
        "Category repositories and rules engine",
        "Reusable filter and table primitives",
      ]}
      description="Transactions will become the operational workspace for search, filters, edits, manual entries, and bulk categorization, with careful handling for ignored and transfer-like rows."
      highlights={[
        { label: "Target phase", value: "Phase 7" },
        { label: "Core job", value: "Review + fix" },
        { label: "Bulk action", value: "Categorize safely" },
      ]}
      inScope={[
        "A searchable, filterable transaction list tuned for mobile and desktop.",
        "Manual add, edit, delete, and correction flows for cash, transfers, and statement cleanup.",
        "Bulk categorization actions without losing visibility into what changed.",
      ]}
      phaseLabel="Phase 7: transaction management"
      title="Transactions"
    />
  );
}
