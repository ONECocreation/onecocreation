"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { insertAtCaret, insertHeroLine, insertLink, insertReadingRoomLink, toggleMark } from "@/lib/letter-marks";
import { READING_PAGE_PATH } from "@/lib/reading-room";
import { cartridge } from "@/brand/cartridge";
import { glassCard, field } from "@/components/console/glass";

/**
 * LETTERS — every letter the house sends, in one room (wireframe v2).
 * TASK-131 (0018.06.16 a₿): Love composes NEW letters here beyond the
 * seeded set ("New letter"), and every sendable letter's send panel lives
 * on its own page, /a/letters/<key>.
 * TASK-493 (0018.06.30): every letter the house sends has a row now —
 * the array is ordered by the five ruled groups (Welcome sequence /
 * Reading / Store / Sessions / System, K126 item 4) and every entry
 * says WHEN it sends in plain words (`when`, traced to its trigger;
 * queued letters say "the next mail run", never a number of minutes).
 * The two Reading `slot` rows name the automatic sends: which composed
 * letter rides each is read live from /api/admin/letters/slots.
 */
type LetterGroup = "Welcome sequence" | "Reading" | "Store" | "Sessions" | "System";
const LETTERS: { key?: string; slot?: "reading-confirm" | "reading-dayof"; name: string; from: string; kind: string; subject: string; note: string; when: string; group: LetterGroup; noPublish?: boolean }[] = [
  {
    key: "lead-magnet",
    name: "Free meditation (lead magnet)",
    from: "news@",
    kind: "on signup · EDITABLE",
    subject: "Your free meditation — Unzip Into the New You",
    note: "the promise on the form, kept as the first letter",
    when: "Sends the moment someone joins the list or signs in for the first time.",
    group: "Welcome sequence",
  },
  {
    key: "welcome",
    name: "Welcome home",
    from: "news@",
    kind: "first sign-in · EDITABLE",
    subject: "Welcome home",
    note: "the first-sign-in hello",
    when: "Queued at a first sign-in; goes out on the next mail run.",
    group: "Welcome sequence",
    noPublish: true,
  },
  {
    key: "welcome-day-two",
    name: "Day-two welcome",
    from: "news@",
    kind: "drip queue · +24h · EDITABLE",
    subject: "Welcome to the field — a note from One Cocreation",
    note: "awaiting Love's words",
    when: "Queued at a genuinely new join or first sign-in and held one day; sends on the first mail run after that.",
    group: "Welcome sequence",
  },
  {
    key: "read-with-love",
    name: "Read with Love, your seat",
    from: "news@",
    kind: "on join · EDITABLE",
    subject: "Read with Love — your seat",
    note: "the seat letter for the weekly reading; {{room}} places the machine-built room link",
    when: "Sends the moment someone joins through the Read with Love door.",
    group: "Reading",
    noPublish: true,
  },
  {
    slot: "reading-confirm",
    name: "Reading confirmation (automatic)",
    from: "news@",
    kind: "automatic · composed letter",
    subject: "the letter riding the sign-up slot",
    note: "the composed letter named on this row is the one that sends",
    when: "Sends the moment someone signs up for the reading; every mail run also sweeps up anyone missed.",
    group: "Reading",
    noPublish: true,
  },
  {
    slot: "reading-dayof",
    name: "Reading day-of (automatic)",
    from: "news@",
    kind: "automatic · composed letter",
    subject: "the letter riding the day-of slot",
    note: "the composed letter named on this row is the one that sends",
    when: "Sends on the reading day after 2 a.m. in the schedule's zone, before the reading begins; a late same-day sign-up gets it right away.",
    group: "Reading",
    noPublish: true,
  },
  {
    key: "order-receipt",
    name: "Order receipt",
    from: "news@",
    kind: "on settle · EDITABLE",
    subject: "Your order — received with love",
    note: "{{lines}} places the items, {{door}} the signed download link",
    when: "Sends the moment an order settles; booking orders get their own letter instead.",
    group: "Store",
    noPublish: true,
  },
  {
    key: "purchase-love-notify",
    name: "A purchase settled (to Love)",
    from: "bookings@ to love@",
    kind: "on settle · EDITABLE",
    subject: "A purchase just settled",
    note: "who + what + the tier or pass + the amount + the write-back door; {{who}} {{lines}} {{tier}} {{amount}} {{writeback}} place the machine-built parts",
    when: "Sends the moment any order settles, on either rail.",
    group: "Store",
    noPublish: true,
  },
  {
    key: "offer-love-notify",
    name: "Offer on the doorstep (to Love)",
    from: "news@ → love@",
    kind: "on under-list offer · EDITABLE",
    subject: "💛 An offer on the doorstep",
    note: "who + offered vs listed + the two one-tap doors; {{who}} {{lines}} {{doors}} place the machine-built parts",
    when: "Sends the moment an under-list offer lands.",
    group: "Store",
    noPublish: true,
  },
  {
    key: "pwyc-accept",
    name: "Offer accepted (to the buyer)",
    from: "news@",
    kind: "on accept · EDITABLE",
    subject: "Your offer — received with love",
    note: "the yes letter — the jar carries the gap; {{lines}} places the offered items",
    when: "Sends the moment the offer is decided, from the email door or the desk.",
    group: "Store",
    noPublish: true,
  },
  {
    key: "pwyc-decline",
    name: "Offer declined (to the buyer)",
    from: "news@",
    kind: "on decline · EDITABLE",
    subject: "Your offer — and your sats coming back",
    note: "the kind no — {{lines}} places the items, {{refund}} the claim-your-sats-back link",
    when: "Sends the moment the offer is decided, from the email door or the desk.",
    group: "Store",
    noPublish: true,
  },
  {
    name: "Booking confirmation",
    from: "bookings@",
    kind: "transactional · .ics attached",
    subject: "Confirmed: Discovery Call — Monday, August 31, 12:30 PM",
    note: "meeting link + calendar file with a built-in reminder",
    when: "Sends the moment a booking is confirmed, with the calendar file attached.",
    group: "Sessions",
  },
  {
    name: "The door is open (class started)",
    from: "news@",
    kind: "transactional",
    subject: "● <room> — the door is open",
    note: "constant house-voice letter with the room's own pill",
    when: "Sends only when a room is opened with the letter option on; the option is off today.",
    group: "Sessions",
  },
  {
    name: "Sign-in code",
    from: "bookings@",
    kind: "transactional",
    subject: "123456 is your One Cocreation sign-in code",
    note: "six digits, ten minutes, five tries",
    when: "Sends the moment someone asks to sign in.",
    group: "System",
  },
  {
    key: "news-sample",
    name: "The News letter (sample)",
    from: "news@",
    kind: "publish/schedule · EDITABLE · rich layout",
    subject: "Greetings and Cheers — from One Cocreation",
    note: "hero + feature cards + big button — !hero / !section / !cta lines shape it; the sample keeps test blocking so Love can SEE it",
    when: "Sends only when Love sends it herself from the send panel.",
    group: "System",
  },
  {
    name: "Rail test letter",
    from: "either persona",
    kind: "operator only",
    subject: "One Cocreation mail rail — test",
    note: "the smoke test",
    when: "Sent by hand alone, when the operator runs the smoke test.",
    group: "System",
  },
];

/* TASK-493: hoisted shared styles. noteInline pays for groupLabel — the
 * two duplicated `{ alignSelf: "center", fontSize: ".75rem", color:
 * "var(--muted)" }` literals (the composer's and the editor's note spans)
 * collapse into one const, so the group labels add ZERO net style objects
 * (the design-drift ceiling for this page is 22 blocks; the census's 30).
 * The label is not a control and never sits on a row's right edge (the /a
 * uniformity law); it rides the list's own flow between groups. */
const noteInlineStyle = { alignSelf: "center", fontSize: ".75rem", color: "var(--muted)" } as const;
/* the micro-label under a row (system letter / send-panel pointer /
 * one-soul note / automatic-send note) — one shape, four sites */
const microLabelStyle = { fontSize: ".62rem", textTransform: "uppercase", color: "var(--muted)" } as const;
const groupLabelStyle = {
  fontSize: ".62rem",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: "var(--muted)",
  padding: "6px 2px 0",
  listStyle: "none",
} as const;

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

  /* TASK-493: the two Reading automatic-send rows name the composed letter
   * currently riding each slot — the GET's EFFECTIVE key per slot
   * (default-riding or explicit alike), the same idiom the detail page
   * uses ([key]/page.tsx). Read once on mount; the desk's own slot edits
   * happen on the letter's page, which refetches there. */
  const [autoSlots, setAutoSlots] = useState<{ "reading-confirm"?: string; "reading-dayof"?: string }>({});
  useEffect(() => {
    fetch("/api/admin/letters/slots")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) setAutoSlots(d.slots ?? {});
      })
      .catch(() => {});
  }, []);

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
    applyMark(insertReadingRoomLink(currentSelection(), READING_PAGE_PATH));
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
            {note && <span style={noteInlineStyle}>{note}</span>}
          </div>
        </div>
        {previewOpen === key && (
          <div className="w-full shrink-0 lg:w-[380px]" style={{ ...glassCard, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "6px 10px", fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".06em",
              color: "var(--info)", borderBottom: "1px solid var(--glass-edge)" }}>
              preview — as the email renders
            </div>
            {previewLoading && <p style={{ padding: 8, fontSize: ".75rem", color: "var(--muted)" }}>rendering…</p>}
            <iframe title={`letter preview — ${key}`} srcDoc={previewHtml} sandbox="" className="w-full" style={{ height: 520, background: "#fff", border: 0 }} />
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
              {note && <span style={noteInlineStyle}>{note}</span>}
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
        {LETTERS.map((l, i) => {
          /* TASK-493: a slot row's key is the composed letter CURRENTLY
             riding that automatic send (the slots GET's effective key);
             before the fetch lands the row shows its words with no doors. */
          const rowKey = l.key ?? (l.slot ? autoSlots[l.slot] : undefined);
          const showLabel = i === 0 || LETTERS[i - 1].group !== l.group;
          return (
            <Fragment key={l.name}>
              {showLabel && (
                <li aria-hidden="true" style={groupLabelStyle}>
                  {l.group}
                </li>
              )}
              <li style={glassCard}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b>
                {l.name}{api(rowKey)?.override ? " ✎" : ""}
                {rowKey && (
                  <>
                    <button onClick={() => openEditor(rowKey, l.subject)} className="ml-2 btn btn-ghost btn-sm">
                      {open === rowKey ? "close" : "edit"}
                    </button>
                    <a href={`/letters/${rowKey}`} target="_blank" rel="noreferrer" className="ml-1 btn btn-ghost btn-sm">
                      preview
                    </a>
                    {!l.noPublish && (
                      <>
                        <a href={`/a/letters/${rowKey}`} className="ml-1 btn btn-sm">
                          send panel →
                        </a>
                        {/* S2: pinned — needs a ruling: this desk page is night chrome (the Tailwind around it never dawns); the theme-aware --ok/--muted would flip at dawn */}
                        <button onClick={() => flipAudience(rowKey)}
                          title="public letters show on /news and the guest feed; members letters only in their receivers' /letters"
                          className={`ml-1 btn btn-sm ${api(rowKey)?.audience === "public" ? "btn-on" : "btn-ghost"}`}>
                          {api(rowKey)?.audience === "public" ? "🌍 public" : "🔒 members"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </b>
              <span style={{ fontSize: ".75rem", color: "var(--info)" }}>{l.from} · {l.kind}</span>
            </div>
            <p className="mt-1" style={{ color: "var(--ink-body)" }}>&ldquo;{api(rowKey)?.override?.subject ?? l.subject}&rdquo;</p>
            {/* the when line rides the row's existing note element — one
                state per row, said once, UNDER the row's words */}
            <p className="mt-1" style={{ fontSize: ".75rem", color: "var(--muted)" }}>{l.note ? `${l.when} · ${l.note}` : l.when}</p>
            {l.key || l.slot ? null : (
              <p className="mt-2" style={microLabelStyle}>system letter — copy lives in code for now</p>
            )}
            {open === rowKey && rowKey && (
              <div>
                {editor(rowKey)}
                {!l.noPublish && (
                  <p className="mt-2" style={microLabelStyle}>
                    sending moved to the <a href={`/a/letters/${rowKey}`} style={{ textDecoration: "underline", color: "var(--info)" }}>send panel</a> — segment, test copy, typed count
                  </p>
                )}
                {l.noPublish && !l.slot && (
                  <p className="mt-2" style={microLabelStyle}>
                    one-soul letter — sends itself when its moment comes; never a list blast
                  </p>
                )}
                {l.slot && (
                  <p className="mt-2" style={microLabelStyle}>
                    automatic send — the letter above rides this slot; change the riding letter on its own page
                  </p>
                )}
              </div>
            )}
              </li>
            </Fragment>
          );
        })}
      </ul>
      <p className="mt-4" style={{ fontSize: ".75rem", color: "var(--muted)" }}>
        Every letter wears the brand shell — logo header, gold accents, honest unsubscribe where
        the law wants it. A letter you compose here can be emailed to the whole list or one
        door&rsquo;s people, and — marked public — published on /news too.
      </p>
    </div>
  );
}
