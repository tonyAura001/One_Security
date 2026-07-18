"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Button } from "@/aurantir-front-kit";
import {
  CONVERSATIONS,
  type ChatLine,
  type Conversation,
} from "@/lib/api/messagerie";
import { cn } from "@/lib/utils";

export function MessagerieScreen() {
  const [convos, setConvos] = useState<Conversation[]>(CONVERSATIONS);
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  const [input, setInput] = useState("");

  const active = convos.find((c) => c.id === activeId) ?? convos[0];

  function select(id: string) {
    setActiveId(id);
    setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const line: ChatLine = { from: "me", text, time: "maintenant" };
    setConvos((cs) =>
      cs.map((c) =>
        c.id === active.id ? { ...c, messages: [...c.messages, line] } : c,
      ),
    );
    setInput("");
  }

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Messagerie</h1>
          <p className="page-subtitle">
            Échangez avec vos équipes en temps réel
          </p>
        </div>
      </div>

      <div className="border-surface-border mt-4 grid h-[calc(100vh-260px)] min-h-[440px] grid-cols-1 overflow-hidden rounded-2xl border md:grid-cols-[280px_1fr]">
        {/* Liste des conversations */}
        <ul className="border-surface-border bg-surface overflow-y-auto border-r max-md:hidden">
          {convos.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => select(c.id)}
                className={cn(
                  "border-surface-border/60 flex w-full items-center gap-3 border-b p-3 text-left transition-colors",
                  c.id === active.id
                    ? "bg-surface-hover"
                    : "hover:bg-surface-hover/50",
                )}
              >
                <span className="bg-blue/15 text-blue flex size-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {c.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1">
                    <span className="text-text-primary truncate text-sm font-semibold">
                      {c.name}
                    </span>
                    {c.unread > 0 && (
                      <span className="bg-blue text-2xs flex size-4 flex-shrink-0 items-center justify-center rounded-full font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </span>
                  <span className="text-2xs text-text-muted block truncate">
                    {c.messages[c.messages.length - 1]?.text}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Fil de la conversation */}
        <div className="bg-background-elevated flex flex-col">
          <div className="border-surface-border bg-surface flex items-center gap-3 border-b p-3">
            <span className="bg-blue/15 text-blue flex size-9 items-center justify-center rounded-full text-xs font-bold">
              {active.initials}
            </span>
            <div>
              <p className="text-text-primary text-sm font-semibold">
                {active.name}
              </p>
              <p className="text-2xs text-text-muted">{active.subtitle}</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {active.messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.from === "me" ? "justify-end" : "justify-start",
                )}
              >
                <div className="max-w-[75%]">
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm",
                      m.from === "me"
                        ? "bg-blue text-white"
                        : "bg-surface border-surface-border text-text-secondary border",
                    )}
                  >
                    {m.text}
                  </div>
                  <p className="text-2xs text-text-muted mt-0.5 px-1">
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form
            className="border-surface-border bg-surface flex items-center gap-2 border-t p-3"
            onSubmit={send}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrire un message…"
              aria-label="Message"
              className="input flex-1 text-sm"
            />
            <Button
              type="submit"
              icon={<Send size={15} />}
              disabled={!input.trim()}
            >
              Envoyer
            </Button>
          </form>
        </div>
      </div>
    </ScreenContainer>
  );
}
