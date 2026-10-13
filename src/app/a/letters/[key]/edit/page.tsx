"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Field } from "@/components/kit";
import LetterCanvas from "@/components/letters/LetterCanvas";
import { CONSOLE_CHROME } from "@/lib/console";
import { applyTextEdit, parseLetter, serializeLetter, withTextSegment, type LetterDoc, type LetterModel } from "@/lib/letter-model";
import { isDrafted } from "@/lib/letters-drafts";

/**
 * T-604 (letters 553a): ONE letter, edited right where it stands. The letter
 * looks like the mail she sends; she clicks on the words and types: bold,
 * italic, a link; then Publish, then a test copy to herself. It writes the
 * letter in today's stored format, byte for byte (src/lib/letter-model.ts), by
 * the same PUT the letters room uses. The send panel stays at /a/letters/<key>.
 * The page never saves on its own; an unsaved edit asks before the page is left.
 */
interface ApiLetter {
  key: string;
  kind: "seeded" | "composed";
  override: { subject: string; body: string; audience?: string } | null;
  default: { subject: string; body: string } | null;
  title: string | null;
  draft?: boolean;
  reviewedAtMs?: number | null;
}

const NOTE_PUBLISHED = "Published. This is the version that sends.";
const NOTE_DRAFT = "Draft saved. It stays in Drafted, and nothing sends until you press Publish.";

export default function LetterEditPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const [letter, setLetter] = useState<ApiLetter | null | undefined>(undefined); // undefined = loading, null = not found
  const [loadFailed, setLoadFailed] = useState(false);
  const [subject, setSubject] = useState("");
  const [model, setModel] = useState<LetterModel | null>(null);
  const modelRef = useRef<LetterModel | null>(null);
  const [problems, setProblems] = useState<Record<number, string>>({});
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [copy, setCopy] = useState<{ canCopy: boolean; to: string | null } | null>(null);
  const [copyNote, setCopyNote] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/letters")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) {
          setLoadFailed(true);
          return;
        }
        const found = (d.letters as ApiLetter[]).find((l) => l.key === key) ?? null;
        setLetter(found);
        if (found && !modelRef.current) {
          const cur = found.override ?? found.default;
          setSubject(cur?.subject ?? found.title ?? "");
          const m = withTextSegment(parseLetter(cur?.body ?? ""));
          modelRef.current = m;
          setModel(m);
        }
      })
      .catch(() => setLoadFailed(true));
  }, [key]);
  useEffect(load, [load]);

  useEffect(() => {
    fetch("/api/admin/letters/copy")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && setCopy({ canCopy: d.canCopy === true, to: d.to ?? null }))
      .catch(() => {});
  }, []);

  /* an unsaved edit asks before the page is left */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const body = model ? serializeLetter(model) : "";

  /* the inbox check: the server's own render, debounced like the room's preview */
  useEffect(() => {
    if (!previewOpen) return;
    const t = setTimeout(() => {
      fetch("/api/admin/letters/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setPreviewHtml(d?.ok ? d.html : ""))
        .catch(() => setPreviewHtml(""));
    }, 300);
    return () => clearTimeout(t);
  }, [body, previewOpen]);

  function onEdit(index: number, doc: LetterDoc) {
    const cur = modelRef.current;
    if (!cur) return;
    const r = applyTextEdit(cur, index, doc);
    if (r.ok) {
      modelRef.current = r.model;
      setModel(r.model);
      setProblems((p) => {
        const { [index]: _gone, ...rest } = p;
        void _gone;
        return rest;
      });
      setDirty(true);
      setNote(null);
    } else {
      setProblems((p) => ({ ...p, [index]: r.reason }));
    }
  }

  function addWords() {
    if (!modelRef.current) return;
    setModel({ ...modelRef.current });
  }

  const blocked = Object.keys(problems).length > 0;

  async function put(publish: boolean) {
    if (blocked) {
      setNote({ kind: "err", text: "Not saved. Fix the words marked above first." });
      return;
    }
    const res = await fetch("/api/admin/letters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publish ? { key, subject, body, publish: true } : { key, subject, body }),
    }).catch(() => null);
    const d = await res?.json().catch(() => ({ ok: false }));
    if (d?.ok) {
      setDirty(false);
      load();
      setNote({ kind: "ok", text: publish ? NOTE_PUBLISHED : NOTE_DRAFT });
    } else {
      setNote({ kind: "err", text: publish ? "Not published. Subject and body are both required." : "Not saved. A draft needs a subject and some words." });
    }
  }

  async function sendCopy() {
    setCopyNote({ kind: "info", text: "Sending..." });
    const d = await fetch("/api/admin/letters/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromEditor: true, key, subject, body }),
    }).then((r) => r.json()).catch(() => null);
    setCopyNote(
      d?.ok
        ? { kind: "ok", text: `Sent to ${d.to ?? copy?.to}. It goes out on the next mail run, with [test] on the subject.` }
        : { kind: "err", text: `Not sent. ${d?.reason ?? "Try again in a moment."}` },
    );
  }

  const title = letter ? (letter.title ?? key.replace(/-/g, " ")) : key.replace(/-/g, " ");
  const noWords = !subject.trim() || !body.trim();

  return (
    <div className="p-6 text-sm">
      <div className="kitx-pane">
        <div>
          <Link className="kit-btn kit-btn-quiet kit-btn-sm" href="/a/letters">Back to the letters</Link>
        </div>
        {CONSOLE_CHROME !== "site" && <h2 className="kit-h2">{title}</h2>}
        {letter === undefined && !loadFailed && <p className="kit-note" aria-live="polite">Loading the letter...</p>}
        {loadFailed && <p className="kit-note kit-note-err" role="alert">The letter did not load. Sign in again and reload this page.</p>}
        {letter === null && (
          <p className="kit-note">This letter is fixed in code. Its words are not edited here.</p>
        )}
        {letter && model && (
          <>
            <p className="kicker">{title}</p>
            <Field id="letter-subject" label="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); setNote(null); }} />
            <LetterCanvas model={model} seeded={letter.kind === "seeded"} onEdit={onEdit} problems={problems} onAddWords={addWords} />
            {!/^\s*!(hero|section|cta):/m.test(body) && (
              <p className="kit-note">
                This letter has no picture, cards or button, so the mail uses the plain shell. Open the inbox check below to see it exactly.
              </p>
            )}
            <div className="kit-btn-row">
              <Button sm onClick={() => put(true)} disabled={noWords}>Publish</Button>
              {isDrafted(key, letter) && (
                <Button sm variant="second" onClick={() => put(false)} disabled={noWords}>Save draft</Button>
              )}
              <Button sm variant="second" onClick={sendCopy} disabled={noWords || copy?.canCopy === false}>Send me a test copy</Button>
            </div>
            <p className="kit-note">Publishing makes this the version that sends.</p>
            {note && <p className={note.kind === "err" ? "kit-note kit-note-err" : note.kind === "ok" ? "kit-note kit-note-ok" : "kit-note"} aria-live="polite">{note.text}</p>}
            <p className={copyNote?.kind === "err" || copy?.canCopy === false ? "kit-note kit-note-err" : copyNote?.kind === "ok" ? "kit-note kit-note-ok" : "kit-note"} aria-live="polite">
              {copyNote?.text ??
                (copy?.canCopy === false
                  ? "Your sign-in has no email address, so there is nowhere to send a copy."
                  : copy?.to
                    ? `A test copy goes to ${copy.to} only, with what is on the screen.`
                    : "A test copy goes to your own address only, with what is on the screen.")}
            </p>
            <div>
              <Button sm variant="second" aria-expanded={previewOpen} onClick={() => setPreviewOpen((o) => !o)}>
                See it as the inbox gets it
              </Button>
            </div>
            {previewOpen && (
              <iframe title={`letter preview: ${key}`} srcDoc={previewHtml} sandbox="" className="kitx-frame" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
