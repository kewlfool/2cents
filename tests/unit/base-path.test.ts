import { afterEach, describe, expect, it, vi } from "vitest";

import { getBasePath, withBasePath } from "@/lib/base-path";

describe("base path helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an empty base path when the app is hosted at the origin root", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");

    expect(getBasePath()).toBe("");
    expect(withBasePath("/manifest.webmanifest")).toBe(
      "/manifest.webmanifest",
    );
  });

  it("normalizes subpath hosting values for GitHub Pages", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "2cents/");

    expect(getBasePath()).toBe("/2cents");
    expect(withBasePath("/service-worker.js")).toBe(
      "/2cents/service-worker.js",
    );
  });
});
