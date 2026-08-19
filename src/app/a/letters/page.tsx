"use client";

import { useEffect, useState } from "react";

/**
 * LETTERS — every letter the house sends today, in one room (wireframe v2).
 * v1 is the honest inventory; the editor (and Love's sample letters as
 * templates) is the next layer on this same page.
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
  {
    name: "Newsletter blasts",
    from: "news@",
    kind: "queue built · compose tab pending",
    subject: "(Love writes; the drip meter drains politely)",
    note: "next build on this page",
  },
];

export default function LettersRoom() {
  const [overrides, setOverrides] = useState<Record<string, { subject: string; body: string } | null>>({});
  const [audiences, setAudiences] = useState<Record<string, "public" | "members">>({});
  const [open, setOpen] = useState<string | null>(null);
  const [subj, setSubj] = useState("");
  const [bodyTxt, setBodyTxt] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/admin/letters")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.ok) return;
        setOverrides(d.overrides ?? {});
        setAudiences(d.audiences ?? {});
      })
      .catch(() => {});
  }, []);

  /** public = the open /news feed; members = only its receivers' /letters */
  async function flipAudience(key: string) {
    const next = audiences[key] === "public" ? "members" : "public";
    const res = await fetch("/api/admin/letters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, audience: next }),
    }).then((r) => r.json()).catch(() => null);
    if (res?.ok) setAudiences((a) => ({ ...a, [key]: next }));
  }

  function openEditor(l: (typeof LETTERS)[number]) {
    if (!l.key) return;
    setOpen(open === l.key ? null : l.key);
    const o = overrides[l.key];
    setSubj(o?.subject ?? l.subject);
    setBodyTxt(o?.body ?? "");
    setNote("");
  }

  const [sendAt, setSendAt] = useState("");
  const [uploading, setUploading] = useState(false);

  function insert(text: string) {
    setBodyTxt((b) => b + (b.endsWith("\n") || b === "" ? "" : "\n") + text);
  }
  function wrap(marks: string) {
    insert(`${marks}text${marks}`);
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

  async function publish(key: string) {
    const res = await fetch("/api/admin/letters/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, at: sendAt ? new Date(sendAt).toISOString() : undefined }),
    });
    const d = await res.json().catch(() => ({ ok: false }));
    setNote(d.ok ? `queued to ${d.queued} souls · ${d.scheduledFor === "next tick" ? "goes out on the next tick" : "scheduled"}` : (d.reason ?? "publish failed"));
  }

  async function save(key: string) {
    const res = await fetch("/api/admin/letters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, subject: subj, body: bodyTxt }),
    });
    if ((await res.json().catch(() => ({ ok: false }))).ok) {
      setOverrides({ ...overrides, [key]: { subject: subj, body: bodyTxt } });
      setNote("saved ✓ — new signups get this version");
    } else setNote("save failed — subject and body both required");
  }

  return (
    <div className="p-2 text-sm">
      <ul className="space-y-2">
        {LETTERS.map((l) => (
          <li key={l.name} className="border border-neutral-700 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b>
                {l.name}{overrides[l.key ?? ""] ? " ✎" : ""}
                {l.key && (
                  <>
                    <button onClick={() => openEditor(l)} className="ml-2 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase text-cyan-300">
                      {open === l.key ? "close" : "edit"}
                    </button>
                    <a href={`/letters/${l.key}`} target="_blank" rel="noreferrer"
                      className="ml-1 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase text-yellow-400">
                      preview
                    </a>
                    {/* S2: pinned — needs a ruling: this desk page is night chrome (the Tailwind around it never dawns); the theme-aware --ok/--muted would flip at dawn */}
                    {!l.noPublish && (
                      <button onClick={() => flipAudience(l.key!)}
                        title="public letters show on /news and the guest feed; members letters only in their receivers' /letters"
                        className="ml-1 border border-neutral-600 px-2 py-0.5 text-[10px] uppercase"
                        style={{ color: audiences[l.key] === "public" ? "#7fb98f" : "#9a8fae" }}>
                        {audiences[l.key] === "public" ? "🌍 public" : "🔒 members"}
                      </button>
                    )}
                  </>
                )}
              </b>
              <span className="text-xs text-cyan-300">{l.from} · {l.kind}</span>
            </div>
            <p className="mt-1 text-neutral-300">&ldquo;{overrides[l.key ?? ""]?.subject ?? l.subject}&rdquo;</p>
            <p className="mt-1 text-xs text-neutral-400">{l.note}</p>
            {l.key ? null : (
              <p className="mt-2 text-[10px] uppercase text-neutral-500">system letter — copy lives in code for now</p>
            )}
            {open === l.key && l.key && (
              <div className="mt-3 space-y-2">
                <input value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="subject"
                  className="w-full border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
                <div className="flex flex-wrap gap-1 text-xs">
                  <button onClick={() => wrap("**")} className="border border-neutral-600 px-2 py-1 font-bold">B</button>
                  <button onClick={() => wrap("*")} className="border border-neutral-600 px-2 py-1 italic">I</button>
                  <button onClick={() => insert("[link text](https://)")} className="border border-neutral-600 px-2 py-1">link</button>
                  <button onClick={() => uploadImage()} className="border border-neutral-600 px-2 py-1">{uploading ? "uploading…" : "📷 image"}</button>
                  <span className="self-center text-[10px] text-neutral-500">**bold** · *italic* · [text](url) · emojis type right in 💛</span>
                </div>
                <textarea id={`ta-${l.key}`} value={bodyTxt} onChange={(e) => setBodyTxt(e.target.value)} rows={10}
                  placeholder="the letter body — blank line makes a new paragraph; the brand shell wraps it"
                  className="w-full border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => save(l.key!)} className="min-h-11 touch-manipulation border border-yellow-500 px-4 py-1 text-xs font-bold text-yellow-400">SAVE</button>
                  {l.noPublish ? (
                    <span className="self-center text-[10px] uppercase text-neutral-500">
                      one-soul letter — sends itself when its moment comes; never a list blast
                    </span>
                  ) : (
                    <>
                      <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)}
                        className="border border-neutral-700 bg-black px-2 py-2 text-base sm:text-sm" />
                      <button onClick={() => publish(l.key!)} className="min-h-11 touch-manipulation border border-neutral-500 px-4 py-1 text-xs">
                        {sendAt ? "SCHEDULE SEND TO LIST" : "PUBLISH TO LIST (next tick)"}
                      </button>
                    </>
                  )}
                  {note && <span className="self-center text-xs text-neutral-400">{note}</span>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-neutral-400">
        Every letter wears the brand shell — logo header, gold accents, honest unsubscribe where
        the law wants it. Bring the sample letters and they land here as editable templates.
      </p>
    </div>
  );
}
