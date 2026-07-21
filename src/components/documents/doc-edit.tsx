"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Champs éditables « invisibles » posés directement sur le document A4 —
 * transparents, héritent de la typo du document, surlignés au focus (jaune).
 * Permettent l'édition « comme Word » : on clique sur le texte et on tape.
 */

const base =
  "bg-transparent outline-none rounded-[3px] px-0.5 -mx-0.5 transition-colors " +
  "focus:bg-[#fde68a]/60 hover:bg-black/[0.03] " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Champ texte inline (sur fond clair). */
export function EditField({
  value,
  onChange,
  className,
  style,
  placeholder,
  type = "text",
  min,
}: {
  value: string | number;
  onChange: (v: string) => void;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  type?: "text" | "number" | "date";
  min?: number;
}) {
  return (
    <input
      type={type}
      min={min}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(base, className)}
      style={style}
    />
  );
}

/** Champ texte inline sur un bandeau sombre (texte blanc, surlignage clair). */
export function EditFieldOnDark({
  value,
  onChange,
  className,
  style,
  placeholder,
  type = "text",
}: {
  value: string | number;
  onChange: (v: string) => void;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  type?: "text" | "number" | "date";
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-[3px] bg-transparent px-0.5 text-white outline-none transition-colors placeholder:text-white/50 focus:bg-white/20 hover:bg-white/10",
        className,
      )}
      style={style}
    />
  );
}

/** Zone de texte multi-ligne inline (sur fond clair). */
export function EditArea({
  value,
  onChange,
  className,
  style,
  placeholder,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(base, "w-full resize-none", className)}
      style={style}
    />
  );
}
