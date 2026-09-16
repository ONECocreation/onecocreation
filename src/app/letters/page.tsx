import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import LettersRoom from "@/components/LettersRoom";
import StackedHero from "@/components/StackedHero";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import { applyLettersToPuck } from "@/lib/puck-blocks/letters-room";
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
  /* TASK-296 (0018.06.25 a₿ · block ~967,200): the shelf is judged on the
     server per request AHEAD of the Puck read (the route-gate-first idiom;
     the claim's own order) — the same read the fallback runs below. */
  const recent: { key: string; subject: string }[] = [];
  // T-131 follow-through: seeded AND composed public letters, one shelf (listPublicLetters reads the registry)
  for (const n of await listPublicLetters()) recent.push(n);

  /* TASK-296 — PUCK first, mirroring /about (page.tsx:68-88) byte-for-byte:
     once Love publishes the Puck rebuild (/style/letters -> Publish), the
     live /letters serves it — with the SAME shelf injected into the
     LettersRoom block's props at render time (applyLettersToPuck; the
     injection is never written back to the store, so a published snapshot
     can't fossilise a letter's words). Until then, the hand-built page
     below is untouched. No route gates on this page. */
  const puck = await getPuckPage("letters");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={applyLettersToPuck(puck as Data, recent)} /></main>
        <SiteFooter />
        {/* STUDIO P2: popup host rides both branches of this page */}
        <PopupHost />
      </>
    );
  }

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
