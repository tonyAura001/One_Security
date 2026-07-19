"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Styles partagés éditeur + rendu (titres, listes, paragraphes). */
export const RTE_PROSE =
  "rte-prose text-[13px] leading-[1.6] text-foreground [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_h2]:font-extrabold [&_h3]:mt-2 [&_h3]:font-bold [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:font-bold";

function Btn({
  active,
  onClick,
  disabled,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-muted hover:bg-hover hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40",
        active && "bg-accent/14 text-accent",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="border-border bg-surface2 flex flex-wrap items-center gap-0.5 rounded-t-[10px] border border-b-0 p-1.5">
      <Btn
        title="Gras"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </Btn>
      <Btn
        title="Italique"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </Btn>
      <Btn
        title="Souligné"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </Btn>
      <span className="bg-border mx-1 h-5 w-px" />
      <Btn
        title="Titre"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="text-[12px] font-extrabold">H</span>
      </Btn>
      <Btn
        title="Liste à puces"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </Btn>
      <Btn
        title="Liste numérotée"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </Btn>
      <span className="bg-border mx-1 h-5 w-px" />
      <Btn
        title="Annuler"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </Btn>
      <Btn
        title="Rétablir"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </Btn>
    </div>
  );
}

/** Éditeur de texte enrichi (TipTap). `value`/`onChange` en HTML. */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          RTE_PROSE,
          "border-border bg-surface min-h-[220px] rounded-b-[10px] border px-3.5 py-3 outline-none",
        ),
        "aria-label": placeholder ?? "Éditeur de texte",
      },
    },
  });

  if (!editor) {
    return (
      <div className="border-border bg-surface2 min-h-[260px] animate-pulse rounded-[10px] border" />
    );
  }

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

/** Rendu lecture seule d'un contenu HTML (pour les gabarits/aperçus). */
export function RichTextView({ html }: { html: string }) {
  return (
    <div
      className={RTE_PROSE}
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}
