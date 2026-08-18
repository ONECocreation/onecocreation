import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StackedHero from "@/components/StackedHero";
import BeInTheKnow from "@/components/BeInTheKnow";
import { EDITABLE_LETTERS, LETTER_DEFAULTS, audienceOf, getLetterOverride } from "@/lib/letters";

export const metadata: Metadata = {
  title: "News & Letters — One Cocreation",
  description: "Love's public notes to the field.",
};

export const dynamic = "force-dynamic";

/* THE NEWS SHELF: only letters marked 🌍 PUBLIC show here (Admiral,
 * 0018.05.15) — members' letters live in their own /letters reading room.
 * Love publishes in the Letters room and the shelf updates the same moment. */
export default async function NewsPage() {
  const notes = [];
  for (const k of EDITABLE_LETTERS) {
    const o = await getLetterOverride(k);
    if (audienceOf(k, o) !== "public") continue;
    const tpl = o ?? LETTER_DEFAULTS[k];
    if (tpl) notes.push({ key: k, subject: tpl.subject });
  }

  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap center reveal" style={{ maxWidth: 680 }}>
          <StackedHero kicker="From the Field" lines={[{ t: "NEWS" }, { t: "& LETTERS", tone: "sub" }]} />
          <p className="lead" style={{ margin: "16px auto 30px" }}>
            Love&apos;s open notes — every public letter lives here after it lands in the inboxes.
          </p>
          <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
            {notes.map((n, i) => (
              <Link key={n.key} href={`/letters/${n.key}`} className="reveal"
                style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", color: "inherit",
                  borderRadius: 18, padding: "16px 20px", background: "var(--glass)",
                  border: "1px solid var(--glass-edge)", boxShadow: "0 18px 44px -28px rgba(120,100,160,.45)",
                  transitionDelay: `${i * 0.08}s` }}>
                <span style={{ fontSize: "1.3rem" }}>🗞️</span>
                <b style={{ flex: 1, fontFamily: "var(--font-h3)", fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-strong)" }}>
                  {n.subject}
                </b>
                <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: ".06em", color: "var(--gold-deep)" }}>read</span>
              </Link>
            ))}
            {notes.length === 0 && (
              <p style={{ color: "var(--muted)", textAlign: "center" }}>no public notes yet — the first is coming ✨</p>
            )}
          </div>
          <BeInTheKnow />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
