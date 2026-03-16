"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getBasePath } from "@/lib/base-path";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type PwaContextValue = {
  canInstall: boolean;
  dismissInstallPrompt: () => void;
  isInstalled: boolean;
  isOfflineReady: boolean;
  isSupported: boolean;
  isUpdateReady: boolean;
  platformHint: "android" | "desktop" | "ios" | "other";
  promptInstall: () => Promise<void>;
  reloadForUpdate: () => void;
  runtimeMode: "development" | "production";
};

const PwaContext = createContext<PwaContextValue | null>(null);

function getPlatformHint() {
  if (typeof navigator === "undefined") {
    return "other" as const;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios" as const;
  }

  if (/android/.test(userAgent)) {
    return "android" as const;
  }

  if (/macintosh|windows|linux/.test(userAgent)) {
    return "desktop" as const;
  }

  return "other" as const;
}

function getStandaloneState() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

type PwaProviderProps = {
  children: ReactNode;
};

export function PwaProvider({ children }: PwaProviderProps) {
  const installPromptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => getStandaloneState());
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);
  const isSupported =
    process.env["NODE_ENV"] === "production" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    function handleStandaloneChange() {
      setIsInstalled(getStandaloneState());
    }

    mediaQuery.addEventListener("change", handleStandaloneChange);
    window.addEventListener("appinstalled", handleStandaloneChange);

    return () => {
      mediaQuery.removeEventListener("change", handleStandaloneChange);
      window.removeEventListener("appinstalled", handleStandaloneChange);
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      installPromptEventRef.current = installEvent;
      setCanInstall(true);
      setInstallPromptDismissed(false);
    }

    function handleAppInstalled() {
      installPromptEventRef.current = null;
      setCanInstall(false);
      setInstallPromptDismissed(true);
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (
      process.env["NODE_ENV"] !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const basePath = getBasePath();
    const serviceWorkerUrl = `${basePath || ""}/service-worker.js`;
    const serviceWorkerScope = `${basePath || ""}/`;
    let hasControllerChanged = false;
    function handleControllerChange() {
      if (hasControllerChanged) {
        return;
      }

      hasControllerChanged = true;
      window.location.reload();
    }

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register(
          serviceWorkerUrl,
          {
            scope: serviceWorkerScope,
          },
        );

        if (registration.waiting && navigator.serviceWorker.controller) {
          setIsUpdateReady(true);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;

          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state !== "installed") {
              return;
            }

            if (navigator.serviceWorker.controller) {
              setIsUpdateReady(true);
              return;
            }

            setIsOfflineReady(true);
          });
        });
      } catch {
        setIsOfflineReady(false);
        setIsUpdateReady(false);
      }
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
    void registerServiceWorker();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  async function promptInstall() {
    const installPromptEvent = installPromptEventRef.current;

    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    const result = await installPromptEvent.userChoice;

    if (result.outcome === "accepted") {
      setCanInstall(false);
      installPromptEventRef.current = null;
      return;
    }

    setInstallPromptDismissed(true);
  }

  function reloadForUpdate() {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.waiting?.postMessage({
          type: "SKIP_WAITING",
        });
      })
      .catch(() => {
        window.location.reload();
      });
  }

  const value = useMemo(
    () =>
      ({
        canInstall: canInstall && !installPromptDismissed && !isInstalled,
        dismissInstallPrompt: () => setInstallPromptDismissed(true),
        isInstalled,
        isOfflineReady,
        isSupported,
        isUpdateReady,
        platformHint: getPlatformHint(),
        promptInstall,
        reloadForUpdate,
        runtimeMode:
          process.env["NODE_ENV"] === "production" ? "production" : "development",
      }) satisfies PwaContextValue,
    [
      canInstall,
      installPromptDismissed,
      isInstalled,
      isOfflineReady,
      isSupported,
      isUpdateReady,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    throw new Error("usePwa must be used within PwaProvider.");
  }

  return context;
}
