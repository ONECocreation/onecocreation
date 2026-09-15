import Link from "next/link";
import type { Retreat } from "@/lib/booking-time";

/**
 * RetreatsList (TASK-231, 0018.06.24 a₿) — the house's FIRST data-bound Puck
 * block. Every local block before it (ParallaxBand, JoinSurface, FormDoors)
 * is pure render; this one paints the live retreat shelf — the same cards
 * the hand-built /retreats page renders, seat counts included.
 *
 * WHY NOT AN ASYNC SERVER COMPONENT: this file rides the CLIENT bundle —
 * puck-config.tsx imports it, and StyleEditor hands that config to the
 * client-side PuckEditor — so `render` cannot be async (client React never
 * awaits a component). The live read (readConfig → listLiveRetreats →
 * refreshRetreatSoldOut, verbatim what src/app/retreats/page.tsx does) runs
 * on the server page instead, and the resolved shelf enters the Puck data at
 * request time through applyRetreatsToPuck below — the applyLionToPuck
 * precedent (memberships). The dynamic part never fossilises in a seed: the
 * stored doc carries no `retreats` prop, the injection is render-time only,
 * never written back.
 *
 * In the designer (and its both-skins preview) there is no injected shelf —
 * the block shows an honest placeholder line, never fake cards.
 */

/** A live retreat with its seat math resolved — plain JSON-safe props. */
export type LiveRetreat = Retreat & { seatsLeft: number };

/* The empty shelf's lead-in; the block appends the fixed /news door
   ("the letters ✨") after it, so Love can reword the line but the door
   itself never drifts. Transcribed from src/app/retreats/page.tsx. */
export const RETREATS_EMPTY_TEXT =
  "No retreats on the horizon just now — the next one will be announced in";

/**
 * The render-time injection: every top-level RetreatsList entry in `data`
 * gains the live shelf as its `retreats` prop. Top-level only (the seed
 * places the block at the root, where the grid sits today) — an entry Love
 * nested into a slot keeps the designer placeholder. Pure; the input is
 * never mutated, and an empty shelf still injects (the empty state is the
 * block's own honest render).
 */
export function applyRetreatsToPuck<T extends { content?: unknown[] }>(data: T, retreats: LiveRetreat[]): T {
  const current = Array.isArray(data.content) ? data.content : [];
  let touched = false;
  const content = current.map((b) => {
    const blk = b as { type?: string; props?: Record<string, unknown> };
    if (blk.type !== "RetreatsList" || !blk.props) return b;
    touched = true;
    return { ...blk, props: { ...blk.props, retreats } };
  });
  return touched ? ({ ...data, content } as T) : data;
}

/* the same span the hand-built page prints ("Sep 3 – Sep 7, 2027") */
function prettySpan(start: string, end: string): string {
  const f = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const year = start.slice(0, 4);
  return `${f(start)} – ${f(end)}, ${year}`;
}

export function createRetreatsList() {
  return {
    label: "Retreats (live shelf)",
    fields: {
      emptyText: {
        type: "textarea" as const,
        label: "Empty-shelf line (the link to the letters is added for you)",
      },
    },
    defaultProps: { emptyText: RETREATS_EMPTY_TEXT },
    render: ({ emptyText, retreats }: { emptyText?: string; retreats?: LiveRetreat[] }) => {
      /* the designer side of the glass: no live shelf here — say so, never
         fake one (honest states; the seeds' "── … ──" note idiom) */
      if (!Array.isArray(retreats)) {
        return (
          <section>
            <div className="wrap center">
              <div className="note">
                ── live retreats shelf: the real cards and seat counts render here on the published page ──
              </div>
            </div>
          </section>
        );
      }
      /* the card grid, markup-verbatim from the hand-built /retreats page —
         the fallback and the block stay identical cards by transcription */
      return (
        <section>
          <div className="wrap center">
            {retreats.length === 0 && (
              <p style={{ color: "var(--muted)" }}>
                {emptyText ?? RETREATS_EMPTY_TEXT}{" "}
                <Link href="/news" style={{ color: "var(--gold-deep)" }}>the letters</Link> ✨
              </p>
            )}
            <div className="grid grid-2" style={{ textAlign: "left" }}>
              {retreats.map((r) => (
                <div className="card reveal" key={r.id}>
                  <div className="thumb" style={{ display: "grid", placeItems: "center", fontSize: "3rem",
                    background: "linear-gradient(135deg,rgba(78,160,175,.35),rgba(139,118,196,.35))" }}>
                    🏜️
                  </div>
                  <div className="body">
                    <h3 style={{ fontWeight: 400, fontSize: "1.25rem" }}>{r.title}</h3>
                    <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: ".2em 0" }}>
                      {prettySpan(r.startDate, r.endDate)} · {r.location}
                    </p>
                    <p style={{ fontSize: ".9rem", color: "var(--ink-body)", margin: ".4em 0 .8em" }}>{r.blurb}</p>
                    <div className="price" style={{ fontSize: "1.25rem" }}>
                      {r.priceSats.toLocaleString("en-US")} sats
                      <small style={{ marginLeft: 8 }}>
                        {r.depositSats != null && `· ${r.depositSats.toLocaleString("en-US")} holds a seat`}
                      </small>
                    </div>
                    <p style={{ fontSize: ".82rem", fontWeight: 700, margin: "6px 0 14px",
                      color: r.seatsLeft > 0 ? "var(--teal-deep)" : "var(--rose)" }}>
                      {r.seatsLeft > 0 ? `${r.seatsLeft} of ${r.seats} seats left` : "all seats taken"}
                    </p>
                    <div className="push">
                      <Link className="btn btn-sm" href={`/retreats/${r.id}`}>
                        {r.seatsLeft > 0 ? "See the days" : "See the days (waitlist by letter)"}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },
  };
}
