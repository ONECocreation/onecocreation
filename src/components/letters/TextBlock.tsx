"use client";

import { useEffect, useState } from "react";
import { Editor, Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import HardBreak from "@tiptap/extension-hard-break";
import { UndoRedo } from "@tiptap/extensions";
import { Button, Field } from "@/components/kit";
import { LINK_REFUSAL, admitsLinkAddress, type LetterDoc } from "@/lib/letter-model";

/**
 * T-604 (letters 553a): ONE text block of the letter, edited right where it
 * stands. TipTap 3 (ProseMirror) edits inside the block; React owns the block
 * model (src/lib/letter-model.ts). Extensions only what the stored format
 * holds: paragraphs, hard breaks, bold, italic, a link, undo and redo, plus
 * `slot`, the locked blank ({{name}}, or a picture line kept as written).
 * Loaded with next/dynamic and ssr:false by LetterCanvas.
 */

/** the locked slot: an inline atom that writes back as exactly the typed text */
const Slot = Node.create({
  name: "slot",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return { raw: { default: "" }, label: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-slot]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-slot": node.attrs.label, class: "kitx-chip", contenteditable: "false" }), String(node.attrs.label)];
  },
  /* one Backspace (or Delete) beside a blank only SELECTS it; a second press removes it */
  addKeyboardShortcuts() {
    const step = (dir: -1 | 1) => () => {
      const { selection } = this.editor.state;
      if (!selection.empty) return false;
      const near = dir < 0 ? selection.$from.nodeBefore : selection.$from.nodeAfter;
      if (near?.type.name !== "slot") return false;
      return this.editor.commands.setNodeSelection(dir < 0 ? selection.from - near.nodeSize : selection.from);
    };
    return { Backspace: step(-1), Delete: step(1) };
  },
});

/* the small stroke icons the room already uses for these three controls */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export interface TextBlockProps {
  /** a stable id for this block's fields */
  id: string;
  doc: LetterDoc;
  onChange: (doc: LetterDoc) => void;
  /** the plain reason this block cannot be saved yet, shown under it */
  problem?: string;
}

export default function TextBlock({ id, doc, onChange, problem }: TextBlockProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [linkError, setLinkError] = useState("");

  const editor: Editor | null = useEditor({
    immediatelyRender: false,
    content: doc,
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      HardBreak,
      UndoRedo,
      Slot,
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        isAllowedUri: (url) => admitsLinkAddress(url),
      }),
    ],
    editorProps: {
      attributes: { "aria-label": "Letter words", "aria-multiline": "true", role: "textbox" },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as LetterDoc),
  });

  const on = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: !!e?.isActive("bold"),
      italic: !!e?.isActive("italic"),
      link: !!e?.isActive("link"),
    }),
  });

  /* Ctrl+K / Cmd+K opens the link box from inside the words */
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLink();
      }
    };
    dom.addEventListener("keydown", onKey);
    return () => dom.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function openLink() {
    if (!editor) return;
    setAddress((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkError("");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const href = address.trim();
    if (!admitsLinkAddress(href)) {
      setLinkError(LINK_REFUSAL);
      return;
    }
    const empty = editor.state.selection.empty && !editor.isActive("link");
    if (empty) editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setLinkError("");
  }

  function removeLink() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setLinkError("");
  }

  return (
    <div className="kitx-block">
      <div className="kitx-even" role="group" aria-label="Format">
        <Button sm variant="second" aria-pressed={on?.bold ?? false} aria-label="Bold" title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Icon><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" /></Icon>
        </Button>
        <Button sm variant="second" aria-pressed={on?.italic ?? false} aria-label="Italic" title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Icon><path d="M19 4h-9" /><path d="M14 20H5" /><path d="M15 4 9 20" /></Icon>
        </Button>
        <Button sm variant="second" aria-pressed={on?.link ?? false} aria-expanded={linkOpen} aria-label="Add a link" title="Add a link (Ctrl+K)"
          onClick={() => (linkOpen ? setLinkOpen(false) : openLink())}>
          <Icon>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </Icon>
        </Button>
      </div>
      {linkOpen && (
        <form className="kit-inline-form" onSubmit={(e) => { e.preventDefault(); applyLink(); }}>
          <Field id={`${id}-link`} label="Link address" value={address} placeholder="https://... or /page"
            onChange={(e) => { setAddress(e.target.value); setLinkError(""); }} error={linkError || undefined} autoFocus />
          <Button type="submit" sm>{on?.link ? "Change link" : "Add link"}</Button>
          {on?.link && <Button sm variant="second" onClick={removeLink}>Remove link</Button>}
        </form>
      )}
      <EditorContent editor={editor} />
      {problem && <p className="kit-note kit-note-err" role="alert">{problem}</p>}
    </div>
  );
}
