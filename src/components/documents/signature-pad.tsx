"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocSignature } from "@/lib/documents/types";

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

/** Capture d'une signature maison : identité + date + tracé au doigt/souris. */
export function SignaturePad({
  value,
  onChange,
}: {
  value: DocSignature | undefined;
  onChange: (sig: DocSignature | undefined) => void;
}) {
  const sig: DocSignature = value ?? { signataire: "", fonction: "", date: "", image: "" };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(Boolean(sig.image));

  function patch(p: Partial<DocSignature>) {
    onChange({ ...sig, ...p });
  }

  // Restaure un tracé existant au montage.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sig.image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = sig.image;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1F3A5F";
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) patch({ image: canvas.toDataURL("image/png") });
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    patch({ image: "" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted flex items-center gap-1.5 text-[11px] font-bold tracking-[0.5px] uppercase">
        <PenLine className="size-3.5" /> Signature
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Signataire</label>
          <input
            className={field}
            value={sig.signataire}
            onChange={(e) => patch({ signataire: e.target.value })}
            placeholder="Nom et prénom"
          />
        </div>
        <div>
          <label className={label}>Fonction</label>
          <input
            className={field}
            value={sig.fonction}
            onChange={(e) => patch({ fonction: e.target.value })}
            placeholder="Ex. Directeur Général"
          />
        </div>
      </div>
      <div>
        <label className={label}>Date de signature</label>
        <input
          type="date"
          className={field}
          value={sig.date}
          onChange={(e) => patch({ date: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>Tracé</label>
        <canvas
          ref={canvasRef}
          width={360}
          height={120}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="border-border bg-surface w-full touch-none rounded-[10px] border"
          style={{ aspectRatio: "3 / 1" }}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-muted text-[10.5px] font-medium">
            {hasStroke ? "Signé" : "Signez dans le cadre"}
          </span>
          <Button size="xs" variant="outline" onClick={clear}>
            <Eraser className="size-3" /> Effacer
          </Button>
        </div>
      </div>
    </div>
  );
}
