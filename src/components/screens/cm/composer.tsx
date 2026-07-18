"use client";

import { useState } from "react";
import { Image as ImageIcon, Shield } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const CHANNELS = ["LinkedIn", "Facebook", "Instagram"] as const;
type Channel = (typeof CHANNELS)[number];

const channelBadge: Record<Channel, string> = {
  LinkedIn: "bg-accent/14 text-accent",
  Facebook: "bg-violet/14 text-violet",
  Instagram: "bg-danger/12 text-danger",
};

const DEFAULT_TEXT =
  "Dakar Sécurité renforce la sûreté du Port Autonome de Dakar 🇸🇳 avec une équipe dédiée 24h/24. Votre sérénité, notre métier. #SécuritéPrivée #Dakar #Gardiennage";

export function CmComposer() {
  const [selected, setSelected] = useState<Channel[]>(["LinkedIn", "Facebook"]);
  const [text, setText] = useState(DEFAULT_TEXT);

  const toggleChannel = (channel: Channel) => {
    setSelected((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]">
        {/* Composer */}
        <Card className="p-5">
          <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
            Nouvelle publication
          </div>

          <div className="text-muted mb-2 text-[11px] font-bold tracking-[0.4px]">
            DIFFUSER SUR
          </div>
          <div className="mb-4 flex flex-wrap gap-2.5">
            {CHANNELS.map((channel) => {
              const active = selected.includes(channel);
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleChannel(channel)}
                  className={cn(
                    "rounded-[10px] border px-3.5 py-2.5 text-[11.5px] font-extrabold transition-colors",
                    active
                      ? "border-accent bg-active text-accent"
                      : "border-border bg-surface2 text-muted hover:bg-hover",
                  )}
                >
                  {channel}
                </button>
              );
            })}
          </div>

          <label htmlFor="composer-text" className="sr-only">
            Texte de la publication
          </label>
          <textarea
            id="composer-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="border-border bg-surface2 text-foreground focus:border-accent min-h-[130px] w-full resize-y rounded-xl border p-3.5 text-[13px] leading-relaxed font-semibold outline-none"
          />
          <div className="text-muted mt-1.5 text-right text-[11px] font-bold">
            {text.length} caractères
          </div>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => toast.info("Ajout d'un visuel")}
              className="border-border bg-surface2 text-muted hover:bg-hover flex aspect-[2/1] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors"
            >
              <ImageIcon size={20} strokeWidth={1.7} />
              <span className="text-[12px] font-bold">Ajouter un visuel</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              className="flex-1"
              onClick={() => toast.success("Publication programmée")}
            >
              Programmer
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success("Publication en ligne")}
            >
              Publier maintenant
            </Button>
          </div>
        </Card>

        {/* Live preview */}
        <Card className="p-4">
          <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.4px]">
            APERÇU
          </div>
          <div className="border-border bg-surface2 overflow-hidden rounded-xl border">
            <div className="flex items-center gap-2.5 p-3">
              <div className="bg-accent flex size-9 flex-none items-center justify-center rounded-[10px] text-white">
                <Shield size={17} strokeWidth={1.9} />
              </div>
              <div>
                <div className="text-foreground text-[12.5px] font-extrabold">
                  Dakar Sécurité
                </div>
                <div className="text-muted text-[10px] font-semibold">
                  Vient de publier · 🌍
                </div>
              </div>
            </div>

            <div className="text-foreground px-3 pb-3 text-[12px] leading-relaxed font-semibold">
              {text.trim().length > 0
                ? text
                : "Votre publication apparaîtra ici…"}
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                {selected.map((channel) => (
                  <span
                    key={channel}
                    className={cn(
                      "rounded-md px-1.5 py-[3px] text-[8px] font-extrabold tracking-[0.3px] uppercase",
                      channelBadge[channel],
                    )}
                  >
                    {channel}
                  </span>
                ))}
              </div>
            )}

            <div className="bg-accent/12 text-muted flex aspect-[2/1] items-center justify-center">
              <ImageIcon size={30} strokeWidth={1.4} />
            </div>

            <div className="text-muted flex gap-4 px-3 py-2.5 text-[11px] font-semibold">
              <span>👍 J&apos;aime</span>
              <span>💬 Commenter</span>
              <span>↗ Partager</span>
            </div>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}
