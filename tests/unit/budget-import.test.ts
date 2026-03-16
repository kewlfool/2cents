import { describe, expect, it } from "vitest";

import {
  buildBudgetImportPreview,
  createBudgetImportMapping,
} from "@/features/budget/lib/budget-import";

describe("budget import staging", () => {
  it("auto-maps common baseline headers", () => {
    const mapping = createBudgetImportMapping([
      "Category",
      "Type",
      "Mode",
      "Planned Amount",
    ]);

    expect(mapping.name).toBe("Category");
    expect(mapping.kind).toBe("Type");
    expect(mapping.mode).toBe("Mode");
    expect(mapping.plannedAmount).toBe("Planned Amount");
  });

  it("normalizes valid rows into staged budget categories", () => {
    const preview = buildBudgetImportPreview(
      {
        fileName: "baseline.csv",
        headers: ["Category", "Type", "Mode", "Planned Amount"],
        rows: [
          {
            Category: "Salary",
            Mode: "Fixed",
            "Planned Amount": "5200",
            Type: "Income",
          },
          {
            Category: "Groceries",
            Mode: "Variable",
            "Planned Amount": "-650",
            Type: "Expense",
          },
        ],
        sourceFormat: "csv",
      },
      createBudgetImportMapping(["Category", "Type", "Mode", "Planned Amount"]),
    );

    expect(preview.errorCount).toBe(0);
    expect(preview.categories).toHaveLength(2);
    expect(preview.categories[0]?.plannedAmount).toBe(520_000);
    expect(preview.categories[1]?.plannedAmount).toBe(65_000);
    expect(preview.warningCount).toBe(1);
  });

  it("blocks duplicate category rows in the same import", () => {
    const preview = buildBudgetImportPreview(
      {
        fileName: "baseline.csv",
        headers: ["Category", "Type", "Mode", "Planned Amount"],
        rows: [
          {
            Category: "Groceries",
            Mode: "Variable",
            "Planned Amount": "650",
            Type: "Expense",
          },
          {
            Category: "Groceries",
            Mode: "Variable",
            "Planned Amount": "700",
            Type: "Expense",
          },
        ],
        sourceFormat: "csv",
      },
      createBudgetImportMapping(["Category", "Type", "Mode", "Planned Amount"]),
    );

    expect(preview.errorCount).toBeGreaterThan(0);
    expect(preview.categories).toHaveLength(1);
  });
});
