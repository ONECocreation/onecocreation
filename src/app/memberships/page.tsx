import type { Metadata } from "next";
import Link from "next/link";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PopupHost from "@/components/PopupHost";
import PaletteVars from "@/components/PaletteVars";
import NotOpenYet from "@/components/NotOpenYet";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Memberships — One Cocreation",
  description: "Welcome to The Heart Field, where Heaven and Earth Meet.",
};

/**
 * THE LION PAGE (the Admiral's walk, 0018.05.10): the header's Memberships
 * door opens HERE — Love's white lion holding the field, her own words from
 * her live site — and GET STARTED TODAY carries you to the three packages.
 * In time for the 8/8 Lions Gate portal. Copy transcribed from
 * onecocreation.com/memberships; confirm wording with Love (checklist).
 *
 * TASK-153 finding: this route never wired PUCK P4 ("Admiral-approved
 * 2026-08-11" — see src/lib/puck-seeds.ts's top comment). /about is the
 * only rebuilt page that checks getPuckPage() before falling back to its
 * hand-built JSX; /memberships, /support, /book, /classes and /store never
 * got the same wiring, so pressing "Publish to live" in /studio for any of
 * those slugs writes KV correctly (traced: setPuckDraft -> publishDraft
 * copies puck:draft:<slug> to puck:page:<slug> in one call, no cache in the
 * way) but the visitor-facing route just never reads it back — the
 * mismatch is a missing read, not a stale write. Fixed here for
 * /memberships only (this lane's OWNS); the same gap on the other four
 * routes is flagged under ## Seams in the SUMMARY for a follow-through.
 */
export default async function MembershipsPage() {
  /* ── TASK-187 GATE (0018.06.18 a₿ · block 966,104) — the route itself
     follows the `memberships` switch now, not just the nav: OFF (still
     Love's own call — default is ON) means a direct /memberships URL
     renders the shared NotOpenYet quiet panel (T-137) inside the site
     chrome, never the lion page. This branch stays FIRST — the PUCK
     P4 read lands right after it (order: 1 gate → 2 Puck → 3 hand-built,
     the T-160 lane's contract). ── */
  const switches = await getSiteConfig();
  if (!switches.features.memberships) {
    return (
      <>
        <SiteHeader />
        <main>
          <NotOpenYet
            title="Memberships aren't open yet"
            body="Love's memberships are still being prepared — come back soon."
          />
        </main>
        <SiteFooter />
      </>
    );
  }
  /* ── end TASK-187 GATE ── */
  // PUCK P4, mirroring /about/page.tsx byte-for-byte: once Love publishes
  // the Puck rebuild (/studio/memberships -> Publish to live), the live
  // /memberships serves it. Until then, the hand-built page below is
  // untouched — nothing changes for visitors until she chooses it.
  const puck = await getPuckPage("memberships");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={puck as Data} /></main>
        <SiteFooter />
        {/* STUDIO P2: popup host rides both branches of this page */}
        <PopupHost />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="lions-gate-dark">
        <div className="wrap" style={{ maxWidth: 720, padding: "64px 22px 80px" }}>
          {/* TASK-153 (A): .kicker{color:var(--rose)} (house.css) loses to
              the higher-specificity .lions-gate-dark p{color:#D9D2E4}
              (cartridge.css) — same class of bug the "You…" <p> below was
              already patched for (Admiral's sighting, 0018.05.24). The
              literal here is that same fix, applied to the kicker: force
              the rose token inline so it out-specifies the blanket p rule. */}
          <p className="kicker" style={{ color: "var(--rose)" }}>Memberships</p>
          <h1 className="sec-h">
            Welcome to The Heart Field — where &ldquo;Heaven and Earth Meet&rdquo;
          </h1>

          <div style={{ fontSize: "1.02rem", lineHeight: 1.75, marginTop: 22 }}>
            <p><b>3 Different Memberships</b></p>
            <p>
              Here IAM meeting up with the energetic field of the ones ready to play and live by
              The Way of the Heart. As IAM, WE ARE ONE.
            </p>
            <p>
              You are the one A-lion-ing in your sovereignty, as I hold an energetic field for
              this work to take place… if you have found me you ARE… ready for this heart
              connection with you 🌈💕🦁
            </p>
            <p>
              You are aligning to a higher potential timeline when you are in this space. This
              magnetizes to you the people, places, things, to your highest reality… as you honor
              your Self you bring forth new energies for humanity.
            </p>
            <p>
              This community is crafted to create a space and field that forms the shape of a
              unified field.
            </p>
            {/* was var(--ink-strong) — this page is lions-gate-dark, a
                keep-dark-law page (Admiral's sighting, 0018.05.24): the
                token flips to dark ink in light theme while the background
                stays night, going dark-on-dark. Every sibling <p> here
                already reads pale from the unconditional .lions-gate-dark p
                rule in cartridge.css; this one just needs the same literal
                its bigger sibling (.sec-h) already wears. */}
            <p style={{ fontFamily: "var(--serif)", fontSize: "1.35rem", color: "#F4ECFF", margin: "26px 0 8px" }}>
              You…
            </p>
            <p>
              For you hold the universe within you. The earth, planets, stars, galaxies… We will
              feel into our clair senses and bring tools forth that have always been there — you
              just didn&apos;t know where to look. We will explore together through sound,
              movement, inspiration and community. Unifying your connection within and without,
              Above and Below — Where Heaven Meets Earth, Paradise in Form.
            </p>
            <p>
              Here to live a life: we love to love, and live to love. Your presence adds to the
              field and shapes the new human. You have arrived! Welcome to the Field of the
              Heart! 💖
            </p>
          </div>

          <div style={{ marginTop: 34, display: "flex", justifyContent: "center" }}>
            <Link className="btn btn-shimmer" href="/packages">
              Get Started Today
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
      {/* STUDIO P2: popup host — no-op unless a live popup lists /memberships */}
      <PopupHost />
    </>
  );
}
