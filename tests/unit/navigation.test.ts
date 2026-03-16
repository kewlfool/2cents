import { describe, expect, it } from "vitest";

import { mainNavItems } from "@/lib/navigation";

describe("mainNavItems", () => {
  it("keeps route hrefs unique", () => {
    const hrefs = mainNavItems.map((item) => item.href);
    const uniqueHrefs = new Set(hrefs);

    expect(uniqueHrefs.size).toBe(hrefs.length);
  });

  it("keeps concise mobile labels", () => {
    expect(mainNavItems.every((item) => item.shortLabel.length <= 7)).toBe(
      true,
    );
  });
});
