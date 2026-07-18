"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  /** Desktop sidebar collapsed to icon rail. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Mobile / tablet nav sheet open. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** True once all persisted stores have rehydrated (see RehydrateGate). */
  hydrated: boolean;
  markHydrated: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "pilotepme-ui",
      skipHydration: true,
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
);
