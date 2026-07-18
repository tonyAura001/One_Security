"use client";

import { toast as sonner } from "sonner";

/** Thin wrapper over sonner so screens share one toast vocabulary (FR). */
export const toast = {
  success: (message: string, description?: string) =>
    sonner.success(message, { description }),
  error: (message: string, description?: string) =>
    sonner.error(message, { description }),
  info: (message: string, description?: string) =>
    sonner(message, { description }),
  warning: (message: string, description?: string) =>
    sonner.warning(message, { description }),
};
