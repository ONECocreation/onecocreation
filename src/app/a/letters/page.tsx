"use client";

import { useEffect, useRef, useState } from "react";
import { insertAtCaret, insertHeroLine, insertLink, insertReadingRoomLink, toggleMark } from "@/lib/letter-marks";
import { READING_ROOM_PATH } from "@/lib/reading-room";
import { cartridge } from "@/brand/cartridge";

/**
 * LETTERS — every letter the house sends, in one room (wireframe v2).
 * TASK-131 (0018.06.16 a₿): Love composes NEW letters here beyond the
 * seeded set ("New letter"), and every sendable letter's send panel lives
 * on its own page, /a/letters/<key>.
 */
const LETTERS: { key?: string; name: string; from: string; kind: string; subject: string; note: string; noPublish?: boolean }[] = [
  {
    name: "Sign-in code",
    from: "bookings@",
    kind: "transactional",
    subject: "123456 is your One Cocreation sign-in code",
    note: "six digits, ten minutes, five tries",
  },
  {
    name: "Booking confirmation",
    from: "bookings@",
    kind: "transactional · .ics attached",
    subject: "Confirmed: Discovery Call — Monday, August 31, 12:30 PM",
    note: "meeting link + calendar file with a built-in reminder",
  },
  {
    key: "lead-magnet",
    name: "Free meditation (lead magnet)",
    from: "news@",
    kind: "on signup · EDITABLE",
    subject: "Your free meditation — Unzip Into the New You",
    note: "the promise on the form, kept as the first letter",
  },
  {
    key: "welcome-day-two",
    name: "Day-two welcome",
    from: "news@",
    kind: "drip queue · +24h · EDITABLE",
    subject: "Welcome to the field — a note from One Cocreation",
    note: "awaiting Love's words",
  },
  {
    key: "news-sample",
    name: "The News letter (sample)",
    from: "news@",
    kind: "publish/schedule · EDITABLE · rich layout",
    subject: "Greetings and Cheers — from One Cocreation",
    note: "hero + feature cards + big button — !hero / !section / !cta lines shape it; the sample keeps test blocking so Love can SEE it",
  },
  {
    key: "offer-love-notify",
    name: "Offer on the doorstep (to Love)",
    from: "news@ → love@",
    kind: "on under-list offer · EDITABLE",
    subject: "💛 An offer on the doorstep",
    note: "who + offered vs listed + the two one-tap doors; {{who}} {{lines}} {{doors}} place the machine-built parts",
    noPublish: true,
  },
  {
    key: "pwyc-accept",
    name: "Offer accepted (to the buyer)",
    from: "news@",
    kind: "on accept · EDITABLE",
    subject: "Your offer — received with love",
    note: "the yes letter — the jar carries the gap; {{lines}} places the offered items",
    noPublish: true,
  },
  {
    key: "pwyc-decline",
    name: "Offer declined (to the buyer)",
    from: "news@",
    kind: "on decline · EDITABLE",
    subject: "Your offer — and your sats coming back",
    note: "the kind no — {{lines}} places the items, {{refund}} the claim-your-sats-back link",
    noPublish: true,
  },
  {
    name: "Rail test letter",
    from: "either persona",
    kind: "operator only",
    subject: "One Cocreation mail rail — test",
    note: "the smoke test",
  },
];

interface ApiLetter {
  key: string;
  kind: "seeded" | "composed";
  override: { subject: string; body: string; audience?: string } | null;
  default: { subject: string; body: string } | null;
  audience: "public" | "members";
  title: string | null;
}

export default function LettersRoom() {
  const [apiLetters, setApiLetters] = useState<ApiLetter[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [subj, setSubj] = useState("");
  const [bodyTxt, setBodyTxt] = useState("");
  const [note, setNote] = useState("");

  // TASK-131: the "New letter" composer
  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newAudience, setNewAudience] = useState<"list" | "public">("list");

  function refresh() {
    fetch("/api/admin/letters")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) return;
        setApiLetters(d.letters ?? []);
      })
      .catch(() => {});
  }
  useEffect(refresh, []);

  const api = (key: string | undefined) => apiLetters.find((l) => l.key === key);
  const composed = apiLetters.filter((l) => l.kind === "composed");

  /** public = the open /news feed; members = only its receivers' /letters */
  async function flipAudience(key: string) {
    const next = api(key)?.audience === "public" ? "members" : "public";
    const res = await fetch("/api/admin/letters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, audience: next }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) refresh();
  }

  function openEditor(key: string, fallbackSubject: string) {
    setOpen(open === key ? null : key);
    setPreviewOpen(null); // a fresh editor never opens onto a stale preview
    const l = api(key);
    setSubj(l?.override?.subject ?? l?.default?.subject ?? fallbackSubject);
    setBodyTxt(l?.override?.body ?? "");
    setNote("");
  }

  const [uploading, setUploading] = useState(false);

  /* TASK-214: the toolbar's real wiring. Root cause of "bold/italic does
   * nothing" — the old insert() always appended to the END of the body,
   * never touching the selection. These read the live textarea's own
   * selectionStart/End (the DOM, not React state, holds the truth of what's
   * highlighted) and hand the result to letter-marks.ts's pure functions;
   * a rAF after the state update restores the selection so a second click
   * (toggling bold back off, say) still sees what the user is looking at. */
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function currentSelection() {
    const el = textareaRef.current;
    if (!el) return { text: bodyTxt, start: bodyTxt.length, end: bodyTxt.length };
    return { text: bodyTxt, start: el.selectionStart ?? bodyTxt.length, end: el.selectionEnd ?? bodyTxt.length };
  }
  function applyMark(result: { text: string; start: number; end: number }) {
    setBodyTxt(result.text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(result.start, result.end);
      }
    });
  }
  function insert(text: string) {
    applyMark(insertAtCaret(currentSelection(), text));
  }
  function applyToggle(mark: string) {
    applyMark(toggleMark(currentSelection(), mark));
  }
  function applyLink() {
    applyMark(insertLink(currentSelection()));
  }
  /* TASK-227: the caret line where Love asked for the reading's link —
   * READING_ROOM_PATH (reading-room.ts's own derivation, the Commons Stage
   * `/rooms/heart-field`) rides straight in, never typed by hand. */
  function insertReadingRoom() {
    applyMark(insertReadingRoomLink(currentSelection(), READING_ROOM_PATH));
  }
  /* TASK-227: the hero banner directive — cartridge.hero.heavenEarth, the
   * curvy purple-and-black "Where Heaven and Earth Meet" script (confirmed
   * against public/images before wiring this in; the same file /about's
   * about-script and the news-sample letter's own default already use). */
  function insertSitePicture() {
    applyMark(insertHeroLine(currentSelection(), cartridge.hero.heavenEarth));
  }
  async function uploadImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setUploading(true);
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/admin/store/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => null);
      setUploading(false);
      if (res?.ok && res.url) insert(`![picture](${res.url})`);
      else setNote("image upload failed");
    };
    input.click();
  }

  async function createNew() {
    const res = await fetch("/api/admin/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        audience: newAudience,
        ...(newKey.trim() ? { key: newKey.trim() } : {}),
      }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      setComposing(false);
      setNewTitle("");
      setNewKey("");
      setNewAudience("list");
      refresh();
      setNote(`letter “${res.key}” born — write it below, then send from its panel`);
    } else setNote(res?.reason ?? "create failed");
  }

  async function save(key: string) {
    const res = await fetch("/api/admin/letters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, subject: subj, body: bodyTxt }),
    });
    if ((await res.json().catch(() => ({ ok: false }))).ok) {
      refresh();
      setNote("saved ✓ — this is the version that sends");
    } else setNote("save failed — subject and body both required");
  }

  /* TASK-214: the NEW side-panel preview — "no preview found" on the call.
   * mail.ts imports nodemailer, so the render can't happen in the client
   * bundle; the panel asks the server for the SAME letterHtml() the send
   * route fires (src/app/api/admin/letters/preview/route.ts), so what Love
   * sees here is exactly what lands in the inbox — never a client-side
   * approximation that could drift from the real send. */
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  function togglePreview(key: string) {
    setPreviewOpen((cur) => (cur === key ? null : key));
  }

  useEffect(() => {
    if (!previewOpen) return;
    const t = setTimeout(() => {
      setPreviewLoading(true);
      fetch("/api/admin/letters/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyTxt }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setPreviewHtml(d?.ok ? d.html : ""))
        .catch(() => setPreviewHtml(""))
        .finally(() => setPreviewLoading(false));
    }, 300); // live, but debounced — no fetch per keystroke
    return () => clearTimeout(t);
  }, [bodyTxt, previewOpen]);

  /** one letter row's shared editor block (seeded and composed alike) */
  function editor(key: string) {
    return (
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <input value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="subject"
            className="w-full border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
          <div className="flex flex-wrap gap-1 text-xs">
            <button onClick={() => applyToggle("**")} className="border border-neutral-600 px-2 py-1 font-bold">B</button>
            <button onClick={() => applyToggle("*")} className="border border-neutral-600 px-2 py-1 italic">I</button>
            <button onClick={applyLink} className="border border-neutral-600 px-2 py-1">link</button>
            <button onClick={() => uploadImage()} className="border border-neutral-600 px-2 py-1">{uploading ? "uploading…" : "📷 image"}</button>
            <button onClick={insertReadingRoom} className="border border-neutral-600 px-2 py-1">Reading room</button>
            <button onClick={insertSitePicture} className="border border-neutral-600 px-2 py-1">Site picture</button>
            <button onClick={() => togglePreview(key)}
              className="border border-cyan-700 px-2 py-1 text-cyan-300" aria-pressed={previewOpen === key}>
              {previewOpen === key ? "✕ close preview" : "👁 preview"}
            </button>
            <span className="self-center text-[10px] text-neutral-500">**bold** · *italic* · [text](url) or [text](/site-path) · Reading room → the weekly reading&apos;s link · Site picture → the banner image · emojis type right in 💛</span>
          </div>
          <textarea id={`ta-${key}`} ref={textareaRef} value={bodyTxt} onChange={(e) => setBodyTxt(e.target.value)} rows={10}
            placeholder="the letter body — blank line makes a new paragraph; the brand shell wraps it"
            className="w-full border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => save(key)} className="min-h-11 touch-manipulation border border-yellow-500 px-4 py-1 text-xs font-bold text-yellow-400">SAVE</button>
            {note && <span className="self-center text-xs text-neutral-400">{note}</span>}
          </div>
        </div>
        {previewOpen === key && (
          <div className="w-full shrink-0 border border-cyan-800 lg:w-[380px]">
            <div className="border-b border-cyan-800 bg-black px-2 py-1 text-[10px] uppercase text-cyan-300">
              preview — as the email renders
            </div>
            {previewLoading && <p className="p-2 text-xs text-neutral-400">rendering…</p>}
            <iframe title={`letter preview — ${key}`} srcDoc={previewHtml} className="h-[520px] w-full bg-white" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-2 text-sm">
      {/* TASK-131: the composer — a new letter beyond the seeded set */}
      <div className="mb-3 border border-yellow-700 p-3">
        {composing ? (
          <div className="space-y-2">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="letter title — e.g. Lions Gate Gathering"
              className="w-full border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key (optional — derived from the title)"
              className="w-full border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input type="radio" checked={newAudience === "list"} onChange={() => setNewAudience("list")} />
                ✉ the list — emailed, members-only
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={newAudience === "public"} onChange={() => setNewAudience("public")} />
                🌍 public — emailed AND shown on /news
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={createNew} className="min-h-11 touch-manipulation border border-yellow-500 px-4 py-1 text-xs font-bold text-yellow-400">CREATE LETTER</button>
              <button onClick={() => setComposing(false)} className="border border-neutral-600 px-3 py-1 text-xs">cancel</button>
              {note && <span className="self-center text-xs text-neutral-400">{note}</span>}
            </div>
          </div>
        ) : (
          <button onClick={() => { setComposing(true); setNote(""); }}
            className="min-h-11 touch-manipulation border border-yellow-500 px-4 py-1 text-xs font-bold text-yellow-400">
            + NEW LETTER
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {composed.map((c) => (
          <li key={c.key} className="border border-yellow-800 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b>
                {c.title ?? c.key} ✎
                <button onClick={() => openEditor(c.key, c.title ?? c.key)} className="ml-2 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase text-cyan-300">
                  {open === c.key ? "close" : "edit"}
                </button>
                <a href={`/a/letters/${c.key}`}
                  className="ml-1 border border-yellow-600 px-2 py-0.5 text-[10px] uppercase text-yellow-400">
                  send panel →
                </a>
                {/* S2: pinned — needs a ruling: this desk page is night chrome (the Tailwind around it never dawns); the theme-aware --ok/--muted would flip at dawn */}
                <button onClick={() => flipAudience(c.key)}
                  title="public letters show on /news and the guest feed; members letters only in their receivers' /letters"
                  className="ml-1 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase"
                  style={{ color: c.audience === "public" ? "#7fb98f" : "#9a8fae" }}>
                  {c.audience === "public" ? "🌍 public" : "✉ the list"}
                </button>
              </b>
              <span className="text-xs text-cyan-300">news@ · composed by Love · EDITABLE</span>
            </div>
            <p className="mt-1 text-neutral-300">&ldquo;{c.override?.subject ?? c.title}&rdquo;</p>
            {open === c.key && editor(c.key)}
          </li>
        ))}
        {LETTERS.map((l) => (
          <li key={l.name} className="border border-neutral-700 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b>
                {l.name}{api(l.key)?.override ? " ✎" : ""}
                {l.key && (
                  <>
                    <button onClick={() => openEditor(l.key!, l.subject)} className="ml-2 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase text-cyan-300">
                      {open === l.key ? "close" : "edit"}
                    </button>
                    <a href={`/letters/${l.key}`} target="_blank" rel="noreferrer"
                      className="ml-1 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase text-yellow-400">
                      preview
                    </a>
                    {!l.noPublish && (
                      <>
                        <a href={`/a/letters/${l.key}`}
                          className="ml-1 border border-yellow-600 px-2 py-0.5 text-[10px] uppercase text-yellow-400">
                          send panel →
                        </a>
                        {/* S2: pinned — needs a ruling: this desk page is night chrome (the Tailwind around it never dawns); the theme-aware --ok/--muted would flip at dawn */}
                        <button onClick={() => flipAudience(l.key!)}
                          title="public letters show on /news and the guest feed; members letters only in their receivers' /letters"
                          className="ml-1 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase"
                          style={{ color: api(l.key)?.audience === "public" ? "#7fb98f" : "#9a8fae" }}>
                          {api(l.key)?.audience === "public" ? "🌍 public" : "🔒 members"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </b>
              <span className="text-xs text-cyan-300">{l.from} · {l.kind}</span>
            </div>
            <p className="mt-1 text-neutral-300">&ldquo;{api(l.key)?.override?.subject ?? l.subject}&rdquo;</p>
            <p className="mt-1 text-xs text-neutral-400">{l.note}</p>
            {l.key ? null : (
              <p className="mt-2 text-[10px] uppercase text-neutral-500">system letter — copy lives in code for now</p>
            )}
            {open === l.key && l.key && (
              <div>
                {editor(l.key)}
                {!l.noPublish && (
                  <p className="mt-2 text-[10px] uppercase text-neutral-500">
                    sending moved to the <a href={`/a/letters/${l.key}`} className="underline text-yellow-400">send panel</a> — segment, test copy, typed count
                  </p>
                )}
                {l.noPublish && (
                  <p className="mt-2 text-[10px] uppercase text-neutral-500">
                    one-soul letter — sends itself when its moment comes; never a list blast
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-neutral-400">
        Every letter wears the brand shell — logo header, gold accents, honest unsubscribe where
        the law wants it. A letter you compose here can be emailed to the whole list or one
        door&rsquo;s people, and — marked public — published on /news too.
      </p>
    </div>
  );
}
