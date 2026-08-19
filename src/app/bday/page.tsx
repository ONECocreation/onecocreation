import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ArcadeFonts from "@/components/ArcadeFonts";

export const metadata: Metadata = {
  title: "Bitcoin Birthday — One Cocreation",
  description:
    "The Bitcoin Birthday checker has moved with the time kit — it returns with this door's new face.",
};

/**
 * /bday — PLACEHOLDER (0018.05.26 a₿, TASK-03 Part 3). The interactive
 * Bitcoin Birthday checker moved OUT with the transplant
 * (transplant/frens-earth-time/ — it was the "full ceremony" of the time
 * kit's converters, and its birth-block reading is a modeled estimate,
 * which the fleet ruling (0018.05.26 a₿: dashes over estimates) keeps off
 * this site's surfaces). The checker lives on under the arcade's own laws
 * in the kit; this page stays as an honest door until Love's new time face
 * is drawn. Nothing here renders a synthetic height.
 */
export default function BdayPage() {
  return (
    <ArcadeFonts>
      <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 640 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">One Cocreation The Bitcoin Birthday checker</p>
          <h1 className="mgmt-title">When were you born, in bitcoin time?</h1>
          <p className="mgmt-blurb">
            The checker that answered this has moved with the time kit to its
            own world — it reads a modeled birth block, and this site only
            shows what the chain can vouch for. It returns with this door&apos;s
            new face. The plain live reading keeps ticking at{" "}
            <a href="/time" className="text-coin/80 underline underline-offset-4 hover:text-coin">
              /time
            </a>
            .
          </p>
        </header>
      </section>
      <SiteFooter />
    </main>
    </ArcadeFonts>
  );
}
