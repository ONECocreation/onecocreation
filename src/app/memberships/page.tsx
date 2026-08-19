import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PopupHost from "@/components/PopupHost";

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
 */
export default function MembershipsPage() {
  return (
    <>
      <SiteHeader />
      <main className="lions-gate-dark">
        <div className="wrap" style={{ maxWidth: 720, padding: "64px 22px 80px" }}>
          <p className="kicker">Memberships</p>
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
