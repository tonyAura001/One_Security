"use client";

import { useState } from "react";
import { Megaphone, Users } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card, Button } from "@/aurantir-front-kit";
import { formatRelativeTime } from "@/aurantir-front-kit/lib/utils";
import {
  AUDIENCE_LABEL,
  RECENT_BROADCASTS,
  type Audience,
  type Broadcast,
} from "@/lib/api/diffusion";
import { toast } from "@/lib/toast";

const AUDIENCES: Audience[] = ["entreprise", "site", "superviseurs", "agents"];

export function DiffusionScreen() {
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState<Audience>("entreprise");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<Broadcast[]>(RECENT_BROADCASTS);

  function diffuser(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    const totals: Record<Audience, number> = {
      entreprise: 52,
      site: 18,
      superviseurs: 9,
      agents: 44,
    };
    const b: Broadcast = {
      id: `b-${sent.length + 1}`,
      subject: subject.trim(),
      audience,
      readCount: 0,
      total: totals[audience],
      sentAt: new Date().toISOString(),
    };
    setSent((s) => [b, ...s]);
    setSubject("");
    setMessage("");
    toast.success("Diffusion envoyée", AUDIENCE_LABEL[audience]);
  }

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Diffusion interne</h1>
          <p className="page-subtitle">
            Communiquez avec vos équipes en un message
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Nouvelle diffusion */}
        <Card>
          <div className="flex items-center gap-2">
            <div className="bg-blue/10 text-blue flex size-8 items-center justify-center rounded-lg">
              <Megaphone size={16} />
            </div>
            <h2 className="text-text-primary text-base font-semibold">
              Nouvelle diffusion
            </h2>
          </div>

          <form className="mt-4 space-y-4" onSubmit={diffuser}>
            <div>
              <label className="text-text-secondary mb-1 block text-xs font-medium">
                Objet
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex. Consignes de sécurité — week-end"
                className="input w-full text-sm"
              />
            </div>

            <div>
              <label className="text-text-secondary mb-1 block text-xs font-medium">
                Audience
              </label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAudience(a)}
                    aria-pressed={audience === a}
                    className={
                      audience === a
                        ? "bg-blue/10 text-blue rounded-full px-3 py-1 text-xs font-medium"
                        : "text-text-muted hover:bg-surface-hover rounded-full px-3 py-1 text-xs font-medium"
                    }
                  >
                    {AUDIENCE_LABEL[a]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-text-secondary mb-1 block text-xs font-medium">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Votre message à l'équipe…"
                className="input w-full resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-2xs text-text-muted">
                Envoyé via push + email + tableau de bord
              </p>
              <Button type="submit" icon={<Megaphone size={14} />}>
                Diffuser
              </Button>
            </div>
          </form>
        </Card>

        {/* Diffusions récentes */}
        <div>
          <p className="text-text-muted mb-2 text-[11px] font-semibold tracking-widest uppercase">
            Diffusions récentes
          </p>
          <div className="space-y-2">
            {sent.map((b) => {
              const pct = Math.round((b.readCount / b.total) * 100);
              return (
                <Card key={b.id} padding="sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-text-primary text-sm font-semibold">
                      {b.subject}
                    </p>
                    <span
                      className="text-2xs text-text-muted flex-shrink-0"
                      suppressHydrationWarning
                    >
                      {formatRelativeTime(b.sentAt)}
                    </span>
                  </div>
                  <div className="text-2xs text-text-muted mt-1.5 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Users size={11} /> {AUDIENCE_LABEL[b.audience]}
                    </span>
                    <span>
                      Lu par {b.readCount}/{b.total} ({pct}%)
                    </span>
                  </div>
                  <div className="bg-surface-hover mt-2 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-green h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </ScreenContainer>
  );
}
