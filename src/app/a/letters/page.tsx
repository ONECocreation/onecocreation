"use client";

import { useEffect, useRef, useState } from "react";
import { insertAtCaret, insertHeroLine, insertLink, insertReadingRoomLink, toggleMark } from "@/lib/letter-marks";
import { READING_ROOM_PATH } from "@/lib/reading-room";
import { cartridge } from "@/brand/cartridge";
import { glassCard, field } from "@/components/console/glass";

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
    setBodyTxt(l?.override?.body ?? l?.default?.body ?? "");
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
            className="w-full console-field" style={field} />
          <div className="flex flex-wrap items-center gap-1">
            <button onClick={() => applyToggle("**")} className="btn btn-ghost btn-sm" style={{ fontWeight: 700 }}>B</button>
            <button onClick={() => applyToggle("*")} className="btn btn-ghost btn-sm" style={{ fontStyle: "italic" }}>I</button>
            <button onClick={applyLink} className="btn btn-ghost btn-sm">link</button>
            <button onClick={() => uploadImage()} className="btn btn-ghost btn-sm">{uploading ? "uploading…" : "📷 image"}</button>
            <button onClick={insertReadingRoom} className="btn btn-ghost btn-sm">Reading room</button>
            <button onClick={insertSitePicture} className="btn btn-ghost btn-sm">Site picture</button>
            <button onClick={() => togglePreview(key)}
              className={`btn btn-sm ${previewOpen === key ? "btn-on" : "btn-ghost"}`} aria-pressed={previewOpen === key}>
              {previewOpen === key ? "✕ close preview" : "👁 preview"}
            </button>
            <span style={{ alignSelf: "center", fontSize: ".68rem", color: "var(--muted)" }}>**bold** · *italic* · [text](url) or [text](/site-path) · Reading room → the weekly reading&apos;s link · Site picture → the banner image · emojis type right in 💛</span>
          </div>
          <textarea id={`ta-${key}`} ref={textareaRef} value={bodyTxt} onChange={(e) => setBodyTxt(e.target.value)} rows={10}
            placeholder="the letter body — blank line makes a new paragraph; the brand shell wraps it"
            className="w-full console-field" style={field} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => save(key)} className="btn btn-sm">SAVE</button>
            {note && <span style={{ alignSelf: "center", fontSize: ".75rem", color: "var(--muted)" }}>{note}</span>}
          </div>
        </div>
        {previewOpen === key && (
          <div className="w-full shrink-0 lg:w-[380px]" style={{ ...glassCard, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "6px 10px", fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".06em",
              color: "var(--info)", borderBottom: "1px solid var(--glass-edge)" }}>
              preview — as the email renders
            </div>
            {previewLoading && <p style={{ padding: 8, fontSize: ".75rem", color: "var(--muted)" }}>rendering…</p>}
            <iframe title={`letter preview — ${key}`} srcDoc={previewHtml} className="w-full" style={{ height: 520, background: "#fff", border: 0 }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 text-sm" style={{ color: "var(--ink)" }}>
      {/* TASK-131: the composer — a new letter beyond the seeded set */}
      <div className="mb-3" style={glassCard}>
        {composing ? (
          <div className="space-y-2">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="letter title — e.g. Lions Gate Gathering"
              className="w-full console-field" style={field} />
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key (optional — derived from the title)"
              className="w-full console-field" style={field} />
            <div className="flex flex-wrap items-center gap-3" style={{ fontSize: ".78rem" }}>
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
              <button onClick={createNew} className="btn btn-sm">CREATE LETTER</button>
              <button onClick={() => setComposing(false)} className="btn btn-ghost btn-sm">cancel</button>
              {note && <span style={{ alignSelf: "center", fontSize: ".75rem", color: "var(--muted)" }}>{note}</span>}
            </div>
          </div>
        ) : (
          <button onClick={() => { setComposing(true); setNote(""); }} className="btn btn-sm">
            + NEW LETTER
          </button>
        )}
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {composed.map((c) => (
          <li key={c.key} style={glassCard}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b>
                {c.title ?? c.key} ✎
                <button onClick={() => openEditor(c.key, c.title ?? c.key)} className="ml-2 btn btn-ghost btn-sm">
                  {open === c.key ? "close" : "edit"}
                </button>
                <a href={`/a/letters/${c.key}`} className="ml-1 btn btn-sm">
                  send panel →
                </a>
                {/* S2: pinned — needs a ruling: this desk page is night chrome (the Tailwind around it never dawns); the theme-aware --ok/--muted would flip at dawn */}
                <button onClick={() => flipAudience(c.key)}
                  title="public letters show on /news and the guest feed; members letters only in their receivers' /letters"
                  className={`ml-1 btn btn-sm ${c.audience === "public" ? "btn-on" : "btn-ghost"}`}>
                  {c.audience === "public" ? "🌍 public" : "✉ the list"}
                </button>
              </b>
              <span style={{ fontSize: ".75rem", color: "var(--info)" }}>news@ · composed by Love · EDITABLE</span>
            </div>
            <p className="mt-1" style={{ color: "var(--ink-body)" }}>&ldquo;{c.override?.subject ?? c.title}&rdquo;</p>
            {open === c.key && editor(c.key)}
          </li>
        ))}
        {LETTERS.map((l) => (
          <li key={l.name} style={glassCard}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b>
                {l.name}{api(l.key)?.override ? " ✎" : ""}
                {l.key && (
                  <>
                    <button onClick={() => openEditor(l.key!, l.subject)} className="ml-2 btn btn-ghost btn-sm">
                      {open === l.key ? "close" : "edit"}
                    </button>
                    <a href={`/letters/${l.key}`} target="_blank" rel="noreferrer" className="ml-1 btn btn-ghost btn-sm">
                      preview
                    </a>
                    {!l.noPublish && (
                      <>
                        <a href={`/a/letters/${l.key}`} className="ml-1 btn btn-sm">
                          send panel →
                        </a>
                        {/* S2: pinned — needs a ruling: this desk page is night chrome (the Tailwind around it never dawns); the theme-aware --ok/--muted would flip at dawn */}
                        <button onClick={() => flipAudience(l.key!)}
                          title="public letters show on /news and the guest feed; members letters only in their receivers' /letters"
                          className={`ml-1 btn btn-sm ${api(l.key)?.audience === "public" ? "btn-on" : "btn-ghost"}`}>
                          {api(l.key)?.audience === "public" ? "🌍 public" : "🔒 members"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </b>
              <span style={{ fontSize: ".75rem", color: "var(--info)" }}>{l.from} · {l.kind}</span>
            </div>
            <p className="mt-1" style={{ color: "var(--ink-body)" }}>&ldquo;{api(l.key)?.override?.subject ?? l.subject}&rdquo;</p>
            <p className="mt-1" style={{ fontSize: ".75rem", color: "var(--muted)" }}>{l.note}</p>
            {l.key ? null : (
              <p className="mt-2" style={{ fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" }}>system letter — copy lives in code for now</p>
            )}
            {open === l.key && l.key && (
              <div>
                {editor(l.key)}
                {!l.noPublish && (
                  <p className="mt-2" style={{ fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" }}>
                    sending moved to the <a href={`/a/letters/${l.key}`} style={{ textDecoration: "underline", color: "var(--info)" }}>send panel</a> — segment, test copy, typed count
                  </p>
                )}
                {l.noPublish && (
                  <p className="mt-2" style={{ fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" }}>
                    one-soul letter — sends itself when its moment comes; never a list blast
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
        Every letter wears the brand shell — logo header, gold accents, honest unsubscribe where
        the law wants it. A letter you compose here can be emailed to the whole list or one
        door&rsquo;s people, and — marked public — published on /news too.
      </p>
    </div>
  );
}
