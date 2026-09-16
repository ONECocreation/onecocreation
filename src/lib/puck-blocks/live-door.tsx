import Link from "next/link";
import JitsiRoom from "@/components/booking/JitsiRoom";

/**
 * LiveDoor (TASK-296 wave B, pair live, 0018.06.25 a₿ · block 967,201) —
 * /live's whole state machine as ONE data-bound block, the RetreatsList
 * shape (GO §2 rubric line 3): the live flag is SERVER-judged
 * (getLiveState, the H13-ruled KV truth), so the page maps it to plain
 * props and applyLiveToPuck injects them at render — never stored, never
 * fossilised (a published snapshot from before a show can't keep a room
 * "live" past its close). The block renders BOTH states, because the h1
 * itself flips with state ("Love is live now" / the editable idle h1).
 *
 * The editable words are FIELDS (stored): the idle h1, the schedule line,
 * the YouTube URL — their defaults are LITERALS transcribed from
 * src/lib/live.ts's LIVE_SCHEDULE/LIVE_YOUTUBE (the constants stay the
 * server single-source; this file rides the client bundle via the studio,
 * and @/lib/live is server-only — the matrix-rooms Turbopack lesson — so
 * the import can't happen here; tests/live-puck.test.ts pins the literals
 * against the constants). Everything else — the connective idle copy, the
 * live card's pills/tier honesty/door/note — is transcribed VERBATIM from
 * src/app/live/page.tsx's fallback (the words law; the fallback keeps its
 * own copy, untouched).
 *
 * The designer canvas gets NO injection — the block renders its idle face
 * from the fields (the honest no-state-judged state, the RetreatsList
 * designer-placeholder idiom: the live face only ever shows when a server
 * page judged it).
 */

export interface LiveDoorLiveProps {
  slug: string;
  title: string;
  kind: "class" | "community";
  /** the opening tier's display name; null = open to every signed-in member */
  tierName: string | null;
  startedAt?: number;
}

export interface LiveDoorEmbedProps {
  jitsiDomain: string;
  liveRoom: string;
}

export interface LiveDoorInjected {
  live: LiveDoorLiveProps | null;
  embed: LiveDoorEmbedProps | null;
}

interface LiveDoorProps {
  idleH1: string;
  schedule: string;
  youtubeUrl: string;
  live?: LiveDoorLiveProps | null;
  embed?: LiveDoorEmbedProps | null;
}

const LIVE_NOW_H1 = "Love is live now";

export function createLiveDoor() {
  return {
    label: "Live door (live state)",
    fields: {
      idleH1: { type: "text" as const, label: "Heading while no room is live" },
      schedule: { type: "text" as const, label: "Schedule line (idle)" },
      youtubeUrl: { type: "text" as const, label: "YouTube URL (idle)" },
    },
    defaultProps: {
      idleH1: "Live, on the rhythm",
      schedule: "Mon · Wed · Fri ~11:11",
      youtubeUrl: "https://www.youtube.com/@Onecocreation",
    },
    render: ({ idleH1, schedule, youtubeUrl, live, embed }: LiveDoorProps) => (
      <>
        <h1 className="mgmt-title">{live ? LIVE_NOW_H1 : idleH1}</h1>
        {live ? (
          <>
            {embed && (
              <div style={{ aspectRatio: "16 / 9", borderRadius: 18, overflow: "hidden", marginBottom: 18 }}>
                <JitsiRoom domain={embed.jitsiDomain} room={embed.liveRoom} height="100%" />
              </div>
            )}
            <div className="card" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "3px 12px",
                    fontSize: ".64rem",
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    background: "rgba(139,118,196,.16)",
                    color: "var(--info)",
                    border: "1px solid rgba(139,118,196,.45)",
                  }}
                >
                  ● live now
                </span>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "3px 12px",
                    fontSize: ".64rem",
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    ...(live.kind === "class"
                      ? { background: "rgba(139,118,196,.16)", color: "var(--info)", border: "1px solid rgba(139,118,196,.45)" }
                      : { background: "rgba(197,110,139,.13)", color: "var(--err)", border: "1px solid rgba(197,110,139,.4)" }),
                  }}
                >
                  {live.kind === "class" ? "Class" : "Community"}
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.3rem", margin: "0 0 6px" }}>
                {live.title}
              </h2>
              <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "0 0 16px" }}>
                {live.tierName === null
                  ? "Open to every signed-in member — the Community Circle is free."
                  : `Opens with the ${live.tierName} package — and everything above it.`}
                {live.startedAt
                  ? ` The doors opened at ${new Date(live.startedAt * 1000).toUTCString().slice(17, 22)} UTC.`
                  : ""}
              </p>
              <Link className="btn" href={`/rooms/${live.slug}`}>
                Enter the room
              </Link>
              <p className="note" style={{ marginTop: 16 }}>
                Signing in is the same door as ever — if the room is above your package it will say so kindly, and show you the way in.
              </p>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: "20px 22px" }}>
            <p style={{ margin: "0 0 10px" }}>
              📺 <b>{schedule}</b> — Love goes live on{" "}
              <a href={youtubeUrl} target="_blank" rel="noreferrer" style={{ color: "var(--gold-deep)" }}>
                YouTube
              </a>
              . The replay stays on the channel when the moment passes.
            </p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: ".88rem" }}>
              Classes and community gather in the rooms —{" "}
              <Link href="/classes" style={{ color: "var(--gold-deep)" }}>
                Classes &amp; Community
              </Link>{" "}
              shows every door and what opens it. When a room opens live, this page carries it here.
            </p>
          </div>
        )}
      </>
    ),
  };
}

/**
 * applyLiveToPuck — the render-time injection (the applyRetreatsToPuck
 * idiom): the server-judged live props land on LiveDoor entries ONLY
 * (never on any other block, never written back to the store — a published
 * snapshot keeps only its fields). Pure; the input is never mutated; a doc
 * with no LiveDoor entry comes back the SAME reference (untouched-path
 * law). RECURSIVE — the seed nests the block inside a Band's slot (the
 * pair-live lesson, found on the lane's own shots: a top-level map injects
 * nothing there and the live face never shows).
 */
export function applyLiveToPuck<T>(data: T, injected: LiveDoorInjected): T {
  let touched = false;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.type === "LiveDoor" && o.props && typeof o.props === "object") {
        touched = true;
        return { ...o, props: { ...(o.props as Record<string, unknown>), live: injected.live, embed: injected.embed } };
      }
      let changed = false;
      const next: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(o)) {
        const nv = walk(val);
        if (nv !== val) changed = true;
        next[k] = nv;
      }
      return changed ? next : v;
    }
    return v;
  };
  const out = walk(data);
  return touched ? (out as T) : data;
}
