"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Paperclip, Search, Send, X } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import type { ChatLine, Conversation, MessagePiece } from "@/lib/api/messagerie";
import {
  fetchConversations, sendMessage, uploadMessageAttachment, getSignedUrl,
} from "@/lib/supabase/data/messagerie";
import { NewCanalDialog } from "./new-canal-dialog";
import { NewDirectDialog } from "./new-direct-dialog";

const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);
const dayKey = (iso?: string) => (iso ? iso.slice(0, 10) : "");
function dayLabel(iso?: string): string {
  if (!iso) return "";
  const d = dayKey(iso);
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d === today) return "Aujourd'hui";
  if (d === yest) return "Hier";
  return formatDateFR(iso, "EEEE d MMMM");
}

export function MessagerieScreen() {
  const qc = useQueryClient();
  const { data: convos = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    refetchInterval: 4000, // quasi temps réel
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const active = convos.find((c) => c.id === (activeId ?? convos[0]?.id)) ?? convos[0] ?? null;

  const filtered = q.trim()
    ? convos.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : convos;

  return (
    <ScreenContainer>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted text-[12px] font-semibold">Échangez en temps réel · partagez photos, vidéos et documents</div>
        <div className="flex items-center gap-1.5"><NewDirectDialog /><NewCanalDialog /></div>
      </div>

      {convos.length === 0 ? (
        <EmptyState title="Aucune conversation" description="Démarrez une discussion directe ou créez un canal d'équipe." />
      ) : (
        <div className="border-border grid h-[calc(100vh-230px)] min-h-[460px] grid-cols-1 overflow-hidden rounded-2xl border md:grid-cols-[300px_1fr]">
          {/* Liste des conversations */}
          <div className="border-border bg-surface flex flex-col border-r max-md:hidden">
            <div className="border-border relative border-b p-2.5">
              <Search className="text-muted absolute top-1/2 left-4 size-4 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
                className="border-border bg-surface2 text-foreground focus:border-accent/50 w-full rounded-[10px] border py-2 pr-3 pl-9 text-[12.5px] font-semibold outline-none" />
            </div>
            <ul className="flex-1 overflow-y-auto">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setActiveId(c.id)}
                    className={cn("border-border/60 flex w-full items-center gap-3 border-b p-3 text-left transition-colors", c.id === active?.id ? "bg-active" : "hover:bg-hover")}>
                    <Avatar name={c.name} initials={c.initials} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-foreground truncate text-[13px] font-bold">{c.name}</span>
                        {c.unread > 0 && <span className="bg-accent flex size-4 flex-none items-center justify-center rounded-full text-[9px] font-bold text-white">{c.unread}</span>}
                      </span>
                      <span className="text-muted block truncate text-[11px] font-semibold">{lastPreview(c)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Fil de conversation */}
          {active && <Thread key={active.id} conv={active} onSent={() => qc.invalidateQueries({ queryKey: ["conversations"] })} />}
        </div>
      )}
    </ScreenContainer>
  );
}

function lastPreview(c: Conversation): string {
  const m = c.messages[c.messages.length - 1];
  if (!m) return c.subtitle;
  if (m.piece) return `📎 ${m.piece.nom}`;
  return m.text || c.subtitle;
}

function Avatar({ name, initials }: { name: string; initials: string }) {
  const tones = ["bg-accent/16 text-accent", "bg-success/16 text-success", "bg-violet/16 text-violet", "bg-warning/16 text-warning"];
  const tone = tones[(name.charCodeAt(0) || 0) % tones.length];
  return <span className={cn("flex size-9 flex-none items-center justify-center rounded-full text-[11px] font-bold", tone)}>{initials}</span>;
}

function Thread({ conv, onSent }: { conv: Conversation; onSent: () => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [conv.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true);
    try {
      let piece: MessagePiece | undefined;
      if (file) piece = await uploadMessageAttachment(file);
      await sendMessage(conv.id, text.trim(), piece);
      setText(""); setFile(null);
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Message non envoyé");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-bg flex min-w-0 flex-col">
      <div className="border-border bg-surface flex items-center gap-3 border-b p-3">
        <Avatar name={conv.name} initials={conv.initials} />
        <div className="min-w-0">
          <div className="text-foreground truncate text-[13.5px] font-bold">{conv.name}</div>
          <div className="text-muted truncate text-[11px] font-semibold">{conv.subtitle}</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto p-4">
        {conv.messages.length === 0 && <div className="text-muted py-10 text-center text-[12.5px] font-semibold">Aucun message. Dites bonjour 👋</div>}
        {conv.messages.map((m, i) => {
          const showDay = dayKey(m.createdAt) !== dayKey(conv.messages[i - 1]?.createdAt);
          return (
            <div key={i}>
              {showDay && m.createdAt && (
                <div className="my-3 flex justify-center">
                  <span className="bg-surface2 text-muted rounded-full px-3 py-1 text-[10.5px] font-bold capitalize">{dayLabel(m.createdAt)}</span>
                </div>
              )}
              <Bubble m={m} />
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-border bg-surface flex flex-col gap-2 border-t p-3">
        {file && (
          <div className="border-border bg-surface2 flex items-center gap-2 self-start rounded-[10px] border px-3 py-1.5">
            <Paperclip className="text-accent size-3.5" />
            <span className="text-foreground max-w-[220px] truncate text-[12px] font-bold">{file.name}</span>
            <span className="text-muted text-[10.5px] font-semibold">{fmtSize(file.size)}</span>
            <button type="button" onClick={() => setFile(null)} aria-label="Retirer" className="text-muted hover:text-danger"><X className="size-3.5" /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" hidden accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
          <Button type="button" size="icon" variant="ghost" aria-label="Joindre un fichier" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /></Button>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message…" aria-label="Message"
            className="border-border bg-surface2 text-foreground focus:border-accent/50 flex-1 rounded-full border px-4 py-2 text-[13px] font-semibold outline-none" />
          <Button type="submit" size="icon" disabled={busy || (!text.trim() && !file)} aria-label="Envoyer">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ m }: { m: ChatLine }) {
  const mine = m.from === "me";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] rounded-2xl px-2.5 py-2 shadow-sm", mine ? "bg-accent text-white" : "bg-surface border-border text-foreground border")}>
        {m.piece && <AttachmentView piece={m.piece} mine={mine} />}
        {m.text && <div className={cn("px-1 text-[13px] leading-snug", m.piece && "mt-1")}>{m.text}</div>}
        <div className={cn("mt-0.5 px-1 text-right text-[9.5px] font-semibold", mine ? "text-white/70" : "text-muted")}>{m.time}</div>
      </div>
    </div>
  );
}

function AttachmentView({ piece, mine }: { piece: MessagePiece; mine: boolean }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["signed", piece.chemin],
    queryFn: () => getSignedUrl(piece.chemin),
    staleTime: 50_000,
  });
  const isImage = piece.type.startsWith("image/");
  const isVideo = piece.type.startsWith("video/");

  if (isLoading || !url) {
    return <div className="flex h-24 w-40 items-center justify-center rounded-lg bg-black/10"><Loader2 className="size-4 animate-spin opacity-60" /></div>;
  }
  if (isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={piece.nom} className="max-h-[240px] max-w-full rounded-lg object-cover" /></a>;
  }
  if (isVideo) {
    return <video src={url} controls preload="metadata" className="max-h-[280px] max-w-full rounded-lg" />;
  }
  return (
    <a href={url} download={piece.nom} target="_blank" rel="noreferrer"
      className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2", mine ? "bg-white/15" : "bg-surface2")}>
      <span className={cn("flex size-9 flex-none items-center justify-center rounded-lg", mine ? "bg-white/20" : "bg-accent/14 text-accent")}><FileText className="size-4" /></span>
      <span className="min-w-0">
        <span className="block max-w-[180px] truncate text-[12.5px] font-bold">{piece.nom}</span>
        <span className={cn("text-[10.5px] font-semibold", mine ? "text-white/75" : "text-muted")}>{fmtSize(piece.taille)}</span>
      </span>
      <Download className={cn("ml-1 size-4 flex-none", mine ? "text-white/80" : "text-muted")} />
    </a>
  );
}
