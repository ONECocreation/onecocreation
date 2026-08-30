"use client";

import { useEffect, useMemo, useState } from "react";
import RoomView from "./RoomView";
import type { MaterialItem, MaterialKind } from "@/lib/class-materials";

/**
 * B — THE LESSON PATH (loves-desk-and-classroom-plan.md): there is NO
 * lesson structure for these rooms (Lane ROOM recon) — so the lesson list
 * is derived honestly from the room's SESSION-attached materials
 * (`attachedTo.kind === "session"`), one lesson per distinct sessionKey,
 * ordered by that group's earliest `addedAtMs` (a sessionKey is an opaque
 * booking id, not a sortable date — `class-materials.ts`'s own header —
 * so `addedAtMs` is the only honest chronology available). Done-state
 * lives in the member's own localStorage. When a room has no session-
 * attached materials: the honest empty state, never a fake lesson — and
 * Room Chat (the same RoomView, unmodified) rides open below it instead
 * of collapsed.
 */

const KIND_LABEL: Record<MaterialKind, string> = { recording: "recording", pdf: "pdf", file: "file" };

interface Feed {
  ok: boolean;
  open?: boolean;
  items?: MaterialItem[];
  reason?: string;
}

interface Lesson {
  sessionKey: string;
  materials: MaterialItem[];
  firstAddedAtMs: number;
}

function deriveLessons(items: MaterialItem[]): Lesson[] {
  const bySession = new Map<string, MaterialItem[]>();
  for (const m of items) {
    if (m.attachedTo.kind !== "session") continue;
    const key = m.attachedTo.sessionKey;
    const list = bySession.get(key) ?? [];
    list.push(m);
    bySession.set(key, list);
  }
  const lessons: Lesson[] = [...bySession.entries()].map(([sessionKey, materials]) => {
    const sorted = [...materials].sort((a, b) => a.addedAtMs - b.addedAtMs);
    return { sessionKey, materials: sorted, firstAddedAtMs: sorted[0].addedAtMs };
  });
  lessons.sort((a, b) => a.firstAddedAtMs - b.firstAddedAtMs);
  return lessons;
}

function doneKey(slug: string): string {
  return `oc-lesson-done:${slug}`;
}
function readDone(slug: string): Set<string> {
  try {
    const raw = localStorage.getItem(doneKey(slug));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeDone(slug: string, done: Set<string>): void {
  try {
    localStorage.setItem(doneKey(slug), JSON.stringify([...done]));
  } catch {
    /* private mode */
  }
}

export default function LessonPathView({
  slug, alias, title, kind,
}: {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(() => readDone(slug));
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/rooms/${encodeURIComponent(slug)}/materials`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d) => { if (alive) setFeed(d); })
      .catch(() => { if (alive) setFeed({ ok: false }); });
    return () => { alive = false; };
  }, [slug]);

  const lessons = useMemo(() => deriveLessons(feed?.items ?? []), [feed]);
  // derived, not stored: a stale `selected` from a previous room simply
  // falls back to the first lesson once `lessons` changes underneath it —
  // no reset-on-slug-change effect needed (react-hooks/set-state-in-effect).
  const effectiveSelected = selected ?? lessons[0]?.sessionKey ?? null;

  function toggleDone(key: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeDone(slug, next);
      return next;
    });
  }

  if (!feed) return <p style={{ color: "var(--muted)" }}>opening the lesson path…</p>;
  if (!feed.ok) {
    return (
      <p style={{ color: "var(--muted)" }}>
        {feed.reason === "materials vault not configured" ? "the lesson path isn't configured here yet" : "the lesson path didn't answer — try again in a moment"}
      </p>
    );
  }
  if (!feed.open) return <p style={{ color: "var(--muted)" }}>this room&apos;s lesson path opens with your package.</p>;

  // no lessons on the shelf: the honest empty state, chat open directly
  // below (not a collapsed drawer — there's nothing here to collapse
  // against, and the copy says "open").
  if (lessons.length === 0) {
    return (
      <div>
        <p className="note" style={{ marginBottom: 16 }}>
          no lessons on this shelf yet — the room&apos;s chat is open below
        </p>
        <RoomView slug={slug} alias={alias} title={title} kind={kind} />
      </div>
    );
  }

  const active = lessons.find((l) => l.sessionKey === effectiveSelected) ?? lessons[0];

  return (
    <div>
      <div className="cls-grid">
        <div className="card" style={{ padding: "14px 18px", minWidth: 0 }}>
          <p style={{ margin: "0 0 10px", fontSize: ".68rem", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>
            Lesson {lessons.findIndex((l) => l.sessionKey === active.sessionKey) + 1}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {active.materials.map((m) => (
              <li key={m.id} style={{ border: "1px solid var(--glass-edge)", borderRadius: 10, padding: "10px 14px", background: "var(--glass)" }}>
                <a href={m.url} target="_blank" rel="noreferrer" style={{ color: "var(--gold-deep)", fontWeight: 600, textDecoration: "none" }}>
                  {m.name}
                </a>
                <span style={{ marginLeft: 8, fontSize: ".62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {KIND_LABEL[m.kind]}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-sm" style={{ marginTop: 14 }} onClick={() => toggleDone(active.sessionKey)}>
            {done.has(active.sessionKey) ? "✓ done" : "mark done"}
          </button>
        </div>
        <nav aria-label="lessons" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {lessons.map((l, i) => {
            const isSelected = l.sessionKey === active.sessionKey;
            return (
              <button
                key={l.sessionKey}
                type="button"
                className="btn btn-ghost btn-sm"
                aria-pressed={isSelected}
                style={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  ...(isSelected ? { borderColor: "var(--gold-deep)", color: "var(--gold-deep)" } : {}),
                }}
                onClick={() => setSelected(l.sessionKey)}
              >
                {done.has(l.sessionKey) ? "✓ " : ""}Lesson {i + 1}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="card" style={{ marginTop: 20, padding: "10px 16px" }}>
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          className="btn btn-ghost btn-sm"
          style={{ width: "100%", display: "flex", justifyContent: "space-between" }}
          aria-expanded={chatOpen}
        >
          <span>Room Chat</span>
          <span aria-hidden="true">{chatOpen ? "▲" : "▼"}</span>
        </button>
        {chatOpen && (
          <div style={{ marginTop: 12 }}>
            <RoomView slug={slug} alias={alias} title={title} kind={kind} />
          </div>
        )}
      </div>
    </div>
  );
}
