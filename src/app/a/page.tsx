import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import OperatorGate from "@/components/OperatorGate";
import OverviewPanel from "@/components/console/OverviewPanel";
import { glassCard } from "@/components/console/glass";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { CONSOLE_SITE, CONSOLE_CHROME } from "@/lib/console";
import { listTips, tipsConfigured, type TipLedger } from "@/lib/tips";
import LovesDesk from "@/components/console/LovesDesk";
import TodaySummary, { type TodayNext } from "@/components/console/TodaySummary";
import { getLiveState, roomForSlug, LIVE_SCHEDULE, LIVE_YOUTUBE } from "@/lib/live";
import { listBookings } from "@/lib/booking-orders";

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
      <p style={{ ...glassCard, padding: "8px 16px", fontSize: ".75rem", color: "var(--muted)" }}>
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
 * - `scar` chrome: SCAR·LET OVERVIEW, the LCARS bridge (boards, sign-offs,
 *   the captain's onboarding) — house furniture, houseOnly rooms included.
 * - `site` chrome: the ARTIST's landing — only the rooms the clone actually
 *   ships (registry entries without houseOnly), spoken in the site's own
 *   voice. An artist managing their shop should never meet the template's
 *   duty roster. (Admiral's catch, 0018.05.10 — sign-offs were leaking.)
 */
export const metadata: Metadata = {
  title: `Overview — ${CONSOLE_SITE.domain} admin`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/* T-326 (0018.06.26 a₿): the next-session read lives server-side —
   listBookings() is the same vault the calendar feed draws from, without
   that route's orders loop. A failed read is the "error" marker, never a
   quiet zero (finding 10). Held + confirmed slots in the future; the list
   arrives pre-sorted by startUtc. Kept out of the component body so the
   purity rule never meets Date.now() (letters/[key]'s helper idiom). */
async function nextUpcomingBooking(): Promise<TodayNext | null | "error"> {
  try {
    const now = Date.now();
    const upcoming = (await listBookings()).find(
      (b) => (b.state === "held" || b.state === "confirmed") && Date.parse(b.startUtc) > now,
    );
    return upcoming
      ? { serviceTitle: upcoming.serviceTitle, startUtc: upcoming.startUtc, endUtc: upcoming.endUtc, artistTz: upcoming.artistTz }
      : null;
  } catch {
    return "error";
  }
}

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
    const todayNext = await nextUpcomingBooking();
    // Home & Calendar (wireframe v2): the jars at a glance, then the week.
    return (
      <div className="p-6">
        <LovesDesk />
        {/* T-326 (0018.06.26 a₿): the Today summary — next session's 24h
            time + title + live action, with T-319's counted pointer mounted
            inside it unchanged (fulfilment still closes out only in the
            Money room's order popup, sessions in their calendar popups) */}
        <TodaySummary next={todayNext} liveNow={!!liveRoom} liveTitle={liveRoom?.title} />
        {/* the six fixed reminders, folded (T-326) — collapsed by default,
            one tap away; the Go-Live pointer keeps its literal /a/live link
            here (TASK-192's fold into the Go-Live room stands) */}
        <details style={{ ...glassCard, marginTop: 26 }}>
          <summary style={{ cursor: "pointer", fontSize: ".82rem", fontWeight: 700, color: "var(--ink-body)",
            minHeight: 44, padding: "12px 0", boxSizing: "border-box" }}>
            Routine checks — the weekly rhythm, tucked away
          </summary>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column",
            gap: 4, fontSize: ".82rem", color: "var(--ink-body)" }}>
            <li>🎥 <b>Go live</b> — the class door moved: <Link href="/a/live" style={{ color: "var(--info)", textDecoration: "underline" }}>the Go-Live room</Link> holds
              the strip and the four ways in: the rooms, YouTube, today&apos;s calls, a guest</li>
            <li>📺 {liveRoom ? <>🔴 <b>LIVE now</b> — <Link href="/live" style={{ color: "var(--info)", textDecoration: "underline" }}>{liveRoom.title}</Link> is open · the banner is up</> : <><b>{LIVE_SCHEDULE}</b> — go live on <a href={LIVE_YOUTUBE} target="_blank" rel="noreferrer" style={{ color: "var(--info)", textDecoration: "underline" }}>YouTube</a></>}</li>
            <li>⚑ <b>Daily</b> — tap a flagged session on the calendar above; saving notes closes it out</li>
            <li>✉️ <b>Weekly</b> — write &amp; publish the news: <Link href="/a/letters" style={{ color: "var(--info)", textDecoration: "underline" }}>Letters</Link> (it lands on <Link href="/news" style={{ color: "var(--info)", textDecoration: "underline" }}>/news</Link> + every inbox)</li>
            <li>🎁 <b>Every visit</b> — give-what-you-can offers waiting: <Link href="/a/money" style={{ color: "var(--info)", textDecoration: "underline" }}>Money Jars · offers desk</Link></li>
            <li>📅 <b>Weekly</b> — hours &amp; days off ring true: <Link href="/a/booking" style={{ color: "var(--info)", textDecoration: "underline" }}>Sessions &amp; hours</Link></li>
            <li>👥 <b>Monthly</b> — who&apos;s new, who needs a hand: <Link href="/a/people" style={{ color: "var(--info)", textDecoration: "underline" }}>People</Link></li>
          </ul>
        </details>
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
        <h1 className="mb-3 mgmt-title">Overview</h1>
        <p className="max-w-2xl font-body text-sm mgmt-lede">
          The console&apos;s front page — how <b>{CONSOLE_SITE.domain}</b>{" "}
          is doing at a glance, and where a first captain begins. The rooms live in the ribbon.
        </p>
      </div>
      <OverviewPanel />
    </main>
  );
}
