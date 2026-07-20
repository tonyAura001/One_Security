"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { createDirectConversation } from "@/lib/supabase/data/messagerie";
import { fetchUserOptions } from "@/lib/supabase/data/options";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

/** Démarre une conversation directe (DM) avec un membre. */
export function NewDirectDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");

  const { data: users } = useQuery({
    queryKey: ["user-options"],
    queryFn: fetchUserOptions,
  });
  const userOpts = users ?? [];

  const mutation = useMutation({
    mutationFn: () => createDirectConversation(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation ouverte");
      setUserId("");
      setOpen(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Échec : ${msg}`);
    },
  });

  const valid = userId !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="outline" title="Nouveau message direct">
          <MessageSquarePlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Nouveau message direct</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mutation.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Destinataire *</label>
            <select
              className={field}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoFocus
            >
              <option value="" disabled>
                — Choisir un membre —
              </option>
              {userOpts.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!valid || mutation.isPending}
            >
              {mutation.isPending ? "Ouverture…" : "Démarrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
