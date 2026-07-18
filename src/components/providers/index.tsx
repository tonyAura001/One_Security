"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/aurantir-front-kit/lib/store/app.store";
import { QueryProvider } from "./query-provider";
import { RehydrateGate } from "./rehydrate-gate";

function ThemedToaster() {
  const theme = useAppStore((s) => s.theme);
  return (
    <Toaster
      theme={theme === "sombre" ? "dark" : "light"}
      position="bottom-right"
      richColors
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontFamily: "var(--font-inter), Inter, sans-serif",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider delayDuration={200}>
        <RehydrateGate />
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </QueryProvider>
  );
}
