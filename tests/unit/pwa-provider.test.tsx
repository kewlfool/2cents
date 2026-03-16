"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PwaProvider,
  usePwa,
} from "@/components/providers/pwa-provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function PwaProbe() {
  const pwa = usePwa();

  return (
    <div>
      <span data-testid="runtime-mode">{pwa.runtimeMode}</span>
      <span data-testid="supported">{String(pwa.isSupported)}</span>
      <span data-testid="installed">{String(pwa.isInstalled)}</span>
      <span data-testid="can-install">{String(pwa.canInstall)}</span>
      <button onClick={() => void pwa.promptInstall()} type="button">
        prompt install
      </button>
      <button onClick={pwa.dismissInstallPrompt} type="button">
        dismiss install
      </button>
    </div>
  );
}

describe("PwaProvider", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        media: "(display-mode: standalone)",
        removeEventListener: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports development runtime defaults during tests", () => {
    render(
      <PwaProvider>
        <PwaProbe />
      </PwaProvider>,
    );

    expect(screen.getByTestId("runtime-mode")).toHaveTextContent("development");
    expect(screen.getByTestId("supported")).toHaveTextContent("false");
    expect(screen.getByTestId("installed")).toHaveTextContent("false");
    expect(screen.getByTestId("can-install")).toHaveTextContent("false");
  });

  it("surfaces install prompt state and marks the app installed after the browser event", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({
        outcome: "accepted" as const,
        platform: "web",
      }),
    }) satisfies BeforeInstallPromptEvent;

    render(
      <PwaProvider>
        <PwaProbe />
      </PwaProvider>,
    );

    window.dispatchEvent(installEvent);

    await waitFor(() => {
      expect(screen.getByTestId("can-install")).toHaveTextContent("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "prompt install" }));

    await waitFor(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("can-install")).toHaveTextContent("false");
    });

    window.dispatchEvent(new Event("appinstalled"));

    await waitFor(() => {
      expect(screen.getByTestId("installed")).toHaveTextContent("true");
    });
  });
});
