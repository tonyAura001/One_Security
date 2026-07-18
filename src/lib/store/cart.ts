"use client";

import { create } from "zustand";

export interface CartLine {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (item: { id: string; name: string; price: number }) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** Point-of-sale cart. Local demo state; a real POS would sync to a till. */
export const useCartStore = create<CartState>((set) => ({
  lines: [],
  add: (item) =>
    set((s) => {
      const existing = s.lines.find((l) => l.id === item.id);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.id === item.id ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      return { lines: [...s.lines, { ...item, qty: 1 }] };
    }),
  increment: (id) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)),
    })),
  decrement: (id) =>
    set((s) => ({
      lines: s.lines
        .map((l) => (l.id === id ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    })),
  remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
  clear: () => set({ lines: [] }),
}));

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}
