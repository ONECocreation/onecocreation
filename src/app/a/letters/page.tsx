"use client";

import { useEffect, useRef, useState } from "react";
import { insertAtCaret, insertHeroLine, insertLink, insertReadingRoomLink, toggleMark } from "@/lib/letter-marks";
import { READING_PAGE_PATH } from "@/lib/reading-room";
import { cartridge } from "@/brand/cartridge";
import { glassCard, field } from "@/components/console/glass";
import { Button, Card, Field } from "@/components/kit";
import { draftWhoWords, isDrafted } from "@/lib/letters-drafts";

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
 * T-552 (the letters room rebuild, lane 1): the room is built on the kit
 * (Card, Button, Field, kit-rows). Drafted sits on top and holds the helper's
 * reading drafts and any letter Love started herself; a letter leaves Drafted
 * when she presses Publish. Her published letters wait in "Your letters". Each
 * row has Edit, Preview and Send (Send only where the letter has a send panel);
 * all three open the EXISTING editor, preview and send panel. No mail changes.
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
    when: "Queued at a first sign-in; goes out on the next mail run. It also sits first in every signed-in member's reading room, so your words are read there too.",
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
    key: "join-reminder",
    name: "The join letter (before the session)",
    from: "news@",
    kind: "before the session · EDITABLE",
    subject: "Your session is coming: the link and the time",
    note: "{{session}} {{when}} {{link}} place the session, the zone-true start time, and the one link; the three plain lines ride the foot",
    when: "Sends on the session's own day on the next mail run after 2 a.m. in the reading's zone; for a booked session, in the 24 hours before it starts, on the next mail run.",
    group: "Sessions",
    noPublish: true,
  },
  {
    key: "join-start",
    name: "The join letter (the session has started)",
    from: "news@",
    kind: "at the start · EDITABLE",
    subject: "The room is open: come on in",
    note: "the short second letter with the same link and the same three plain lines",
    when: "Sends when the session starts, on the next mail run after the start; never a promised minute.",
    group: "Sessions",
    noPublish: true,
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

/* the editor's own note span (the editor keeps its inline look until lane 553a) */
const noteInlineStyle = { alignSelf: "center", fontSize: ".75rem", color: "var(--muted)" } as const;

/* T-552: the fixed parts of a letter, said once under its words. The house
 * fills the {{slots}} named in the row's note; the logo header and the footer
 * are the shell. Lane 553a makes the words editable in place; this only says
 * plainly what Love cannot move. */
function fixedWords(note: string): string {
  const slots = [...new Set([...note.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
  const shell = "Fixed: the logo header and the footer.";
  if (slots.length === 0) return shell;
  return `${shell} The house fills in ${slots.join(", ")}; your words go around them.`;
}

/* an empty subject says so, in plain muted words, never an empty pair of quotes */
function subjectLine(subject: string | null | undefined) {
  return subject?.trim() ? <em>&ldquo;{subject}&rdquo;</em> : <em className="kit-note">No subject yet</em>;
}

const weekdayOf = (ms: number) => new Date(ms).toLocaleDateString("en-US", { weekday: "long" });

const GROUPS: LetterGroup[] = ["Welcome sequence", "Reading", "Store", "Sessions", "System"];

interface ApiLetter {
  key: string;
  kind: "seeded" | "composed";
  override: { subject: string; body: string; audience?: string } | null;
  default: { subject: string; body: string } | null;
  audience: "public" | "members";
  title: string | null;
  createdAtMs?: number | null;
  updatedAtMs?: number | null;
  draft?: boolean;
  reviewedAtMs?: number | null;
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
  const drafted = composed.filter((c) => isDrafted(c.key, c));
  const yours = composed.filter((c) => !isDrafted(c.key, c));

  /* T-552: one row's right edge. Edit, Preview and Send are the same size, in
   * one group. Edit opens the existing inline editor, Preview opens the
   * existing "as the email renders" preview, Send is a link to the existing
   * send panel (the typed headcount lives there). Letters that send
   * themselves have no Send. */
  function rowEnd(key: string, fallbackSubject: string, o: { send: boolean; label?: string; main?: boolean }) {
    return (
      <span className="kit-rows-end kit-rows-pair kitx-even">
        {o.send && (
          <a className="kit-btn kit-btn-second kit-btn-sm" href={`/a/letters/${key}`} aria-label="Send" title="Send this letter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
            </svg>
          </a>
        )}
        <Button sm variant={o.main ? "main" : "second"} onClick={() => openEditor(key, fallbackSubject)} aria-expanded={open === key}>
          {open === key ? "Close" : (o.label ?? "Edit")}
        </Button>
        <Button sm variant="second" onClick={() => openPreview(key, fallbackSubject)} aria-pressed={previewOpen === key}>
          Preview
        </Button>
      </span>
    );
  }

  /* T-552: what used to ride the row's edge (public or members, the site
   * preview) moves into the opened row, one control per strip. */
  function openedRow(key: string, o: { flip: boolean; pointer?: string }) {
    return (
      <div className="kitx-row">
        {editor(key)}
        <ul className="kit-rows kit-rows-stackable">
          {o.flip && (
            <li>
              <div>
                <b>Who sees it on the site</b>
                <em>Public letters show on /news and the guest feed. Members letters show only in their receivers&apos; letters.</em>
              </div>
              <span className="kit-rows-end">
                <Button sm variant="second" onClick={() => flipAudience(key)} aria-pressed={api(key)?.audience === "public"}>
                  {api(key)?.audience === "public" ? "Public" : "Members only"}
                </Button>
              </span>
            </li>
          )}
          <li>
            <div>
              <b>See it on the site</b>
              <em>The page a reader gets to open.</em>
            </div>
            <span className="kit-rows-end">
              <a className="kit-btn kit-btn-second kit-btn-sm" href={`/letters/${key}`} target="_blank" rel="noreferrer">
                Open
              </a>
            </span>
          </li>
        </ul>
        {o.pointer && <p className="kit-note">{o.pointer}</p>}
      </div>
    );
  }

  /* T-552: a draft's row (Drafted group): a draft with words says Review, an
   * empty one says Keep writing. */
  function draftRow(c: ApiLetter) {
    const words = (c.override?.body ?? "").trim().length > 0;
    return (
      <li key={c.key}>
        <div>
          <b>{c.title ?? c.key}</b>
          {subjectLine(c.override?.subject ?? c.title)}
          <em>{draftWhoWords(c.key, c.createdAtMs, weekdayOf, words)}</em>
        </div>
        {rowEnd(c.key, c.title ?? c.key, { send: false, label: words ? "Review" : "Keep writing", main: words })}
        {open === c.key && openedRow(c.key, { flip: true, pointer: "Nothing is sent until you press Publish and then send it from its send panel." })}
      </li>
    );
  }

  /* T-552: a letter Love published herself (no longer a draft) */
  function yoursRow(c: ApiLetter) {
    return (
      <li key={c.key}>
        <div>
          <b>{c.title ?? c.key}</b>
          {subjectLine(c.override?.subject ?? c.title)}
          <em>Composed by you. {c.audience === "public" ? "Emailed and shown on /news." : "Emailed to the list."}</em>
          <em>{fixedWords("")}</em>
        </div>
        {rowEnd(c.key, c.title ?? c.key, { send: true })}
        {open === c.key && openedRow(c.key, { flip: true, pointer: "Sending lives in the send panel: pick who, send yourself a test copy, type the count." })}
      </li>
    );
  }

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

  /* T-552: the row's Preview control. Opens the row and its existing
   * "as the email renders" preview in one press; pressing it again closes it. */
  function openPreview(key: string, fallbackSubject: string) {
    if (open === key && previewOpen === key) {
      setOpen(null);
      setPreviewOpen(null);
      return;
    }
    const l = api(key);
    setSubj(l?.override?.subject ?? l?.default?.subject ?? fallbackSubject);
    setBodyTxt(l?.override?.body ?? l?.default?.body ?? "");
    setNote("");
    setOpen(key);
    setPreviewOpen(key);
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
    const title = newTitle.trim();
    const res = await fetch("/api/admin/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, audience: newAudience }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) {
      setComposing(false);
      setNewTitle("");
      setNewAudience("list");
      refresh();
      /* the new letter opens in Drafted, ready to write */
      setOpen(res.key);
      setPreviewOpen(null);
      setSubj(title);
      setBodyTxt("");
      setNote(`Letter created. Write it below, then press Publish.`);
    } else setNote(res?.reason ?? "create failed");
  }

  async function save(key: string) {
    const res = await fetch("/api/admin/letters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, subject: subj, body: bodyTxt, publish: true }),
    });
    if ((await res.json().catch(() => ({ ok: false }))).ok) {
      refresh();
      setNote("Published. This is the version that sends.");
    } else setNote("Not published. Subject and body are both required.");
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
            <button onClick={() => save(key)} className="btn btn-sm">PUBLISH</button>
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
      <div className="kitx-flow">
        <div className="kitx-group">
          <h2 className="kit-h2">Letters</h2>
          <p className="kit-text-quiet">Every email the house sends. Pick one to write it and see it as the reader will.</p>
          <div>
            <Button sm variant="second" onClick={() => { setComposing(!composing); setNote(""); }} aria-expanded={composing}>
              New letter
            </Button>
          </div>
        </div>

        {composing && (
          <Card>
            <form className="kit-inline-form" onSubmit={(e) => { e.preventDefault(); createNew(); }}>
              <Field id="new-letter-title" label="Letter title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="for example, Lions Gate Gathering" />
              <Button type="submit" sm disabled={!newTitle.trim()}>Create letter</Button>
            </form>
            <div className="kit-btn-row" role="radiogroup" aria-label="Who it is for">
              <label className="kit-field-label">
                <input type="radio" name="new-letter-audience" checked={newAudience === "list"} onChange={() => setNewAudience("list")} />{" "}
                The list: emailed, members only
              </label>
              <label className="kit-field-label">
                <input type="radio" name="new-letter-audience" checked={newAudience === "public"} onChange={() => setNewAudience("public")} />{" "}
                Public: emailed and shown on /news
              </label>
            </div>
            <Button sm variant="quiet" onClick={() => setComposing(false)}>Cancel</Button>
            {note && <p className="kit-note">{note}</p>}
          </Card>
        )}

        <div className="kitx-group">
          <p className="kicker">Drafted</p>
          <Card>
            <p className="kit-text-quiet">
              Drafts written for you by the helper, and letters you started yourself. Nothing is sent until you have looked it over and pressed Publish.
            </p>
            {drafted.length > 0 ? (
              <ul className="kit-rows kit-rows-stackable">{drafted.map(draftRow)}</ul>
            ) : (
              <p className="kit-note">Nothing is waiting. A new draft shows up here.</p>
            )}
            {!composing && note && <p className="kit-note">{note}</p>}
          </Card>
        </div>

        {yours.length > 0 && (
          <div className="kitx-group">
            <p className="kicker">Your letters</p>
            <Card>
              <ul className="kit-rows kit-rows-stackable">{yours.map(yoursRow)}</ul>
            </Card>
          </div>
        )}

        {GROUPS.map((g) => (
          <div className="kitx-group" key={g}>
            <p className="kicker">{g}</p>
            <Card>
              <ul className="kit-rows kit-rows-stackable">
                {LETTERS.filter((l) => l.group === g).map((l) => {
                  /* TASK-493: a slot row's key is the composed letter CURRENTLY
                     riding that automatic send (the slots GET's effective key);
                     before the fetch lands the row shows its words with no doors. */
                  const rowKey = l.key ?? (l.slot ? autoSlots[l.slot] : undefined);
                  return (
                    <li key={l.name}>
                      <div>
                        <b>{l.name}{api(rowKey)?.override ? " (edited)" : ""}</b>
                        {subjectLine(api(rowKey)?.override?.subject ?? l.subject)}
                        {/* the when line, said once, under the row's words */}
                        <em>{l.when}</em>
                        <em>{l.key || l.slot ? fixedWords(l.note) : "System letter: every part is fixed, the copy lives in code for now."}</em>
                      </div>
                      {rowKey ? rowEnd(rowKey, l.subject, { send: !l.noPublish }) : null}
                      {open === rowKey && rowKey && openedRow(rowKey, {
                        flip: !l.noPublish,
                        pointer: l.slot
                          ? "Automatic send. The letter above rides this slot; change the riding letter on its own page."
                          : l.noPublish
                            ? "One-soul letter. It sends itself when its moment comes, never a list blast."
                            : "Sending lives in the send panel: pick who, send yourself a test copy, type the count.",
                      })}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ))}

        <p className="kit-note">
          Every letter wears the brand shell: logo header, accents, an honest unsubscribe where
          the law wants it. A letter you compose here can be emailed to the whole list or one
          door&rsquo;s people, and, marked public, published on /news too.
        </p>
      </div>
    </div>
  );
}
