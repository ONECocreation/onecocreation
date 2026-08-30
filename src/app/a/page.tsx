import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import OperatorGate from "@/components/OperatorGate";
import OverviewPanel from "@/components/console/OverviewPanel";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { CONSOLE_SITE, CONSOLE_CHROME, CONSOLE_ROOMS } from "@/lib/console";
import { listTips, tipsConfigured, type TipLedger } from "@/lib/tips";
import LovesDesk from "@/components/console/LovesDesk";
import AttentionStrip from "@/components/console/AttentionStrip";
import LiveDoorCard from "@/components/console/LiveDoorCard";
import { getLiveState, roomForSlug, LIVE_SCHEDULE, LIVE_YOUTUBE } from "@/lib/live";

const JAR_LABELS: Record<string, string> = {
  love: "Tip Love",
  onecocreation: "Tip One Cocreation",
  payforward: "Pay It Forward",
};

/** The jars, read live from BTCPay. Pay-it-forward is a promise held for
 *  someone who hasn't arrived yet — it gets shown even at zero. */
/** THE SCOREBOARD (Admiral, 0018.05.18): the jars as one slim banner —
 *  glance, don't dwell; Money Jars holds the full books. */
async function TipJarsCard({ banner = false }: { banner?: boolean }) {
  void banner;
  if (!tipsConfigured()) return null;
  let ledger: TipLedger;
  try {
    ledger = await listTips();
  } catch {
    return (
      <p className="border border-neutral-800 px-4 py-2 text-xs text-neutral-400">
        jars unreachable — check the BTCPay key&apos;s &quot;view invoices&quot; permission
      </p>
    );
  }
  return (
    <Link
      href="/a/money"
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 22px",
        borderRadius: 14, padding: "10px 18px", textDecoration: "none",
        border: "1.5px solid rgba(180,134,43,.4)", background: "rgba(217,178,78,.08)",
      }}
    >
      {(Object.keys(JAR_LABELS) as (keyof typeof ledger.totals)[]).map((jar) => (
        <span key={jar} style={{ fontSize: ".8rem", color: "var(--muted, #9a8fae)" }}>
          {JAR_LABELS[jar]}{" "}
          <b style={{ color: "var(--gold-deep, #d9b24e)" }}>{ledger.totals[jar].settledSats.toLocaleString()}</b>
          <span style={{ fontSize: ".68rem" }}> sats</span>
        </span>
      ))}
      <span style={{ marginLeft: "auto", fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--gold-deep, #d9b24e)" }}>
        the books
      </span>
    </Link>
  );
}

/**
 * The console FRONT PAGE — two faces, one gate.
 *
 * - `scar` chrome: SCAR·LET OVERVIEW, the arcade bridge (boards, sign-offs,
 *   the captain's onboarding) — house furniture, houseOnly rooms included.
 * - `site` chrome: the ARTIST's landing — only the rooms the clone actually
 *   ships (registry entries without houseOnly), spoken in the site's own
 *   voice. An artist managing their shop should never meet the arcade's
 *   duty roster. (Admiral's catch, 0018.05.10 — sign-offs were leaking.)
 */
export const metadata: Metadata = {
  title: `Overview — ${CONSOLE_SITE.domain} admin`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ConsoleOverviewPage() {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  if (CONSOLE_CHROME === "site") {
    // the live flag — the schedule line below and /live read this same truth
    const live = await getLiveState();
    const liveRoom = live.live && live.room ? roomForSlug(live.room) : undefined;
    // Home & Calendar (wireframe v2): the jars at a glance, then the week.
    return (
      <div>
        <LovesDesk />
        {/* the day's actions live WITH the calendar (Admiral, 0018.05.15) —
            goods to ship + offers waiting; sessions close out in their popups */}
        <AttentionStrip />
        {/* S40 lane 1 — the class door's first home: open the room, the bot
            carries the word, the banner lights */}
        <LiveDoorCard />
        {/* THE WEEKLY RHYTHM (Admiral, 0018.05.18): where Love checks, when */}
        <div className="mt-6 border border-neutral-800 p-4 text-sm">
          <h2 className="text-sm text-neutral-100">Love&apos;s week — where to check</h2>
          <ul className="mt-2 space-y-1 text-xs text-neutral-300">
            <li>📺 {liveRoom ? <>🔴 <b>LIVE now</b> — <Link className="underline" href="/live">{liveRoom.title}</Link> is open · the banner is up</> : <><b>{LIVE_SCHEDULE}</b> — go live on <a className="underline" href={LIVE_YOUTUBE} target="_blank" rel="noreferrer">YouTube</a></>}</li>
            <li>⚑ <b>Daily</b> — tap a flagged session on the calendar above; saving notes closes it out</li>
            <li>✉️ <b>Weekly</b> — write &amp; publish the news: <Link className="underline" href="/a/letters">Letters</Link> (it lands on <Link className="underline" href="/news">/news</Link> + every inbox)</li>
            <li>🎁 <b>Every visit</b> — give-what-you-can offers waiting: <Link className="underline" href="/a/money">Money Jars · offers desk</Link></li>
            <li>📅 <b>Weekly</b> — hours &amp; days off ring true: the calendar above</li>
            <li>👥 <b>Monthly</b> — who&apos;s new, who needs a hand: <Link className="underline" href="/a/people">People</Link></li>
          </ul>
        </div>
        {/* the jars, as a scoreboard strip (Admiral, 0018.05.18) — the big
            card retired; the left rail already IS the rooms map */}
        <div className="mt-6">
          <TipJarsCard banner />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pb-4 pt-10">
        <p className="lcars-eyebrow mb-3" data-accent="cyan">
          ◗ CONSOLE FRONT PAGE · {CONSOLE_SITE.domain.toUpperCase()}
        </p>
        <h1 className="mb-3 font-arcade text-4xl text-cyan glow-cyan">SCAR·LET OVERVIEW</h1>
        <p className="max-w-2xl font-body text-sm text-white/55">
          The console&apos;s front page — how <b className="text-white/75">{CONSOLE_SITE.domain}</b>{" "}
          is doing at a glance, and where a first captain begins. The rooms live in the ribbon.
        </p>
      </div>
      <OverviewPanel />
    </main>
  );
}
