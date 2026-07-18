/**
 * Semantic colour helpers. Every colour in the UI resolves through these
 * token names — no raw hex in components. `text-*` gives the solid colour,
 * `tint` gives the soft translucent background used for icon chips/badges.
 */

export type Tone =
  | "success"
  | "accent"
  | "danger"
  | "warning"
  | "violet"
  | "foreground"
  | "muted";

export const toneText: Record<Tone, string> = {
  success: "text-success",
  accent: "text-accent",
  danger: "text-danger",
  warning: "text-warning",
  violet: "text-violet",
  foreground: "text-foreground",
  muted: "text-muted",
};

export const toneTint: Record<Tone, string> = {
  success: "bg-success/12",
  accent: "bg-accent/14",
  danger: "bg-danger/12",
  warning: "bg-warning/14",
  violet: "bg-violet/14",
  foreground: "bg-foreground/10",
  muted: "bg-muted/12",
};

export const toneBar: Record<Tone, string> = {
  success: "bg-success",
  accent: "bg-accent",
  danger: "bg-danger",
  warning: "bg-warning",
  violet: "bg-violet",
  foreground: "bg-foreground",
  muted: "bg-muted",
};
