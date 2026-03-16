"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ensureAppDataReady, type BootstrapResult } from "@/db";

type AppBootstrapState = {
  errorMessage: string | null;
  result: BootstrapResult | null;
  status: "booting" | "error" | "ready";
};

const AppBootstrapContext = createContext<AppBootstrapState | null>(null);

type AppBootstrapProviderProps = {
  children: ReactNode;
};

export function AppBootstrapProvider({ children }: AppBootstrapProviderProps) {
  const [state, setState] = useState<AppBootstrapState>({
    errorMessage: null,
    result: null,
    status: "booting",
  });

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      try {
        const result = await ensureAppDataReady();

        if (ignore) {
          return;
        }

        setState({
          errorMessage: null,
          result,
          status: "ready",
        });
      } catch (error) {
        if (ignore) {
          return;
        }

        setState({
          errorMessage:
            error instanceof Error
              ? error.message
              : "Unable to initialize local app data.",
          result: null,
          status: "error",
        });
      }
    }

    void bootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AppBootstrapContext.Provider value={state}>
      {children}
    </AppBootstrapContext.Provider>
  );
}

export function useAppBootstrap() {
  const context = useContext(AppBootstrapContext);

  if (!context) {
    throw new Error(
      "useAppBootstrap must be used within AppBootstrapProvider.",
    );
  }

  return context;
}
