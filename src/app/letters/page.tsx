import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LettersRoom from "@/components/LettersRoom";
import StackedHero from "@/components/StackedHero";
import { listPublicLetters } from "@/lib/letters";

export const metadata: Metadata = {
  title: "Your Letters — One Cocreation",
  description: "The letters Love has sent you, in one reading room.",
};

export const dynamic = "force-dynamic";

/**
 * /letters — each member's own reading room. WHO is asking is resolved
 * client-side per request (LettersRoom → /api/me/letters, no-store), so a
 * cached page can never wear someone else's mailbox. Guests meet the free
 * meditation and the recent PUBLIC notes.
 */
export default async function LettersPage() {
  const recent: { key: string; subject: string }[] = [];
  // T-131 follow-through: seeded AND composed public letters, one shelf (listPublicLetters reads the registry)
  for (const n of await listPublicLetters()) recent.push(n);

  return (
    <main>
      <SiteHeader />
      <section>
        <div className="wrap center reveal" style={{ maxWidth: 640 }}>
          <StackedHero kicker="From Love, To You" lines={[{ t: "YOUR" }, { t: "LETTERS", tone: "teal" }]} />
          <div style={{ marginTop: 26 }}>
            <LettersRoom recent={recent} />
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
