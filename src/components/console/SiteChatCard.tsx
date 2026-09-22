"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/console/glass";
import { ROOMS } from "@/lib/matrix-rooms";
import type { SiteConfig } from "@/lib/site-config";

/**
 * TASK-387 (block 968,088+) — Love's studio ask via the Admiral: "/studio-
 * love would like to hide the chat fully for some of the rooms. even
 * during some sessions turn it on and off." One row per room, the T-381
 * `/a/site/reading` idiom exactly (`ReadingScheduleCard.tsx`: GET on
 * mount, validate, PUT, refuse in words — self-contained, no other
 * surface changes from this card alone). Save sends ONLY the changed
 * slug(s) since load, never the whole `ROOMS` set — `saveSiteConfig`
 * merges per-slug server-side, so a stale operator tab can never clobber
 * a room it never touched. Flipping mid-session IS the live session
 * toggle (Named decision A) — there is no separate "session-only"
 * control to confuse with the saved default.
 *
 * RULED (review fold), all held here in the copy itself:
 *  - the Save action reads "Save to apply" — never implies a change is
 *    live before it's sent;
 *  - a toggled-but-unsaved row wears a "pending" WORD beside the toggle
 *    (legibility doctrine — never color alone);
 *  - a failed save shows the error in words and never claims success
 *    (the `note` state only ever starts with "saved" on a real 200);
 *  - propagation wording is "rooms follow within about one poll after
 *    Save" — never a "20 seconds" promise (Named decision B's own cost,
 *    named honestly, not a number to hand Love).
 */

type ChatValue = "on" | "hidden";

/** The same slug derivation `site-config.ts`'s `ROOM_SLUGS` and
 *  `rooms/[slug]/page.tsx`'s `bySlug` both already use. */
function roomSlug(id: string): string {
  return id.slice(1, id.indexOf(":"));
}

/* Named style consts, referenced as `style={ident}` — a single-brace
   identifier reference, never a `style={{` double-brace literal (the
   Template check's own carve-out, tests/design-drift.test.ts's R8 note
   on `style={field}`/`style={glassCard}`). Every value below rides a
   cartridge token — no literal color. */
const wrap: React.CSSProperties = { marginBottom: 12 };
const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  background: "var(--glass)", border: "1px solid var(--glass-edge)",
  borderRadius: 12, padding: "10px 14px", marginBottom: 8,
};
const roomLabel: React.CSSProperties = { flex: 1, minWidth: 200, fontSize: ".9rem" };
const muted: React.CSSProperties = { fontSize: ".82rem", color: "var(--muted)", margin: "0 0 10px", maxWidth: 640 };
const saveRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginTop: 18 };
const noteOk: React.CSSProperties = { fontSize: ".8rem", color: "var(--ok)" };
const noteErr: React.CSSProperties = { fontSize: ".8rem", color: "var(--err)" };

export default function SiteChatCard() {
  const [saved, setSaved] = useState<Record<string, ChatValue> | null>(null);
  const [draft, setDraft] = useState<Record<string, ChatValue>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/site", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;
      const stored = (data.config as SiteConfig).rooms ?? {};
      const seeded: Record<string, ChatValue> = {};
      for (const r of ROOMS) {
        // Named decision D: an absent slug (or an absent chat within it)
        // means chat ON — today's behavior is the default.
        seeded[roomSlug(r.id)] = stored[roomSlug(r.id)]?.chat === "hidden" ? "hidden" : "on";
      }
      setSaved(seeded);
      setDraft(seeded);
    })();
  }, []);

  function toggle(slug: string) {
    setNote(null);
    setDraft((d) => ({ ...d, [slug]: d[slug] === "hidden" ? "on" : "hidden" }));
  }

  async function save() {
    if (!saved) return;
    // Only the slug(s) that changed since load ride the patch — never
    // the whole ROOMS set (Build 3: the server merges per-slug, so a
    // stale operator tab can never clobber a room it never touched).
    const changed: Record<string, { chat: ChatValue }> = {};
    for (const slug of Object.keys(draft)) {
      if (draft[slug] !== saved[slug]) changed[slug] = { chat: draft[slug] };
    }
    if (Object.keys(changed).length === 0) {
      setNote("nothing changed since the last save");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rooms: changed }),
      });
      const data = await res.json();
      if (data.ok) {
        const stored = (data.config as SiteConfig).rooms ?? {};
        const next: Record<string, ChatValue> = {};
        for (const r of ROOMS) {
          next[roomSlug(r.id)] = stored[roomSlug(r.id)]?.chat === "hidden" ? "hidden" : "on";
        }
        setSaved(next);
        setDraft(next);
        setNote("saved — rooms follow within about one poll after Save");
      } else {
        setNote(data.reason ?? "save failed");
      }
    } catch {
      setNote("save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!saved) return <p style={muted}>reading the rooms…</p>;

  const dirty = ROOMS.some((r) => draft[roomSlug(r.id)] !== saved[roomSlug(r.id)]);

  return (
    <div style={wrap}>
      <p style={muted}>Save to apply — rooms follow within about one poll after Save, no reload needed.</p>

      {ROOMS.map((r) => {
        const slug = roomSlug(r.id);
        const value = draft[slug] ?? "on";
        const isDirty = value !== saved[slug];
        return (
          <div key={slug} style={row}>
            <button
              type="button"
              aria-pressed={value === "on"}
              aria-label={`${r.title} — chat currently ${value === "on" ? "on" : "hidden"}`}
              onClick={() => toggle(slug)}
              className={`btn btn-sm ${value === "on" ? "btn-on" : "btn-ghost"}`}
            >
              {value === "on" ? "ON" : "HIDDEN"}
            </button>
            <b style={roomLabel}>{r.title}</b>
            <Chip tone={value === "on" ? "green" : "grey"}>
              {value === "on" ? "chat ON — members see it" : "chat HIDDEN — no chat column"}
            </Chip>
            {isDirty && <Chip tone="lavender">pending — not yet saved</Chip>}
          </div>
        );
      })}

      <div style={saveRow}>
        <button type="button" className="btn btn-gold btn-sm" disabled={busy || !dirty} onClick={save}>
          {busy ? "Saving…" : "Save to apply"}
        </button>
        {note && <span style={note.startsWith("saved") ? noteOk : noteErr}>{note}</span>}
      </div>
    </div>
  );
}
