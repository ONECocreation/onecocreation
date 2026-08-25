import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { TIERS } from "@/lib/entitlement";
import { getLiveState, roomForSlug, LIVE_SCHEDULE, LIVE_YOUTUBE } from "@/lib/live";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live — One Cocreation",
};

/**
 * THE LIVE PAGE (TASK-37/S40 lane 2, H13 ruled). Live: what's on, who can
 * enter (tier honesty straight from the room's own gate), the door in —
 * which is the member door, so sign-in and locks stay exactly as honest as
 * the rooms shelf. Idle: the schedule voice (the single truth the /a
 * console now reads too) + the standing YouTube pointer. No stream embed
 * in this slice.
 */
export default async function LivePage() {
  const state = await getLiveState();
  const room = state.live && state.room ? roomForSlug(state.room) : undefined;

  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 880 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">Live</p>
          <h1 className="mgmt-title">{state.live && room ? "Love is live now" : "Live, on the rhythm"}</h1>
        </header>

        {state.live && room ? (
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
                  ...(room.kind === "class"
                    ? { background: "rgba(139,118,196,.16)", color: "var(--info)", border: "1px solid rgba(139,118,196,.45)" }
                    : { background: "rgba(197,110,139,.13)", color: "var(--err)", border: "1px solid rgba(197,110,139,.4)" }),
                }}
              >
                {room.kind === "class" ? "Class" : "Commons"}
              </span>
            </div>
            <h2 style={{ fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.3rem", margin: "0 0 6px" }}>
              {room.title}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "0 0 16px" }}>
              {room.minTier === "all"
                ? "Open to every signed-in member — the Community Circle is free."
                : `Opens with the ${TIERS[room.minTier].name} package — and everything above it.`}
              {state.startedAt
                ? ` The doors opened at ${new Date(state.startedAt * 1000).toUTCString().slice(17, 22)} UTC.`
                : ""}
            </p>
            <Link className="btn" href={`/rooms/${state.room}`}>
              Enter the room
            </Link>
            <p className="note" style={{ marginTop: 16 }}>
              Signing in is the same door as ever — if the room is above your package it will say so kindly, and show you the way in.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "20px 22px" }}>
            <p style={{ margin: "0 0 10px" }}>
              📺 <b>{LIVE_SCHEDULE}</b> — Love goes live on{" "}
              <a href={LIVE_YOUTUBE} target="_blank" rel="noreferrer" style={{ color: "var(--gold-deep)" }}>
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
      </section>
      <SiteFooter />
    </main>
  );
}
