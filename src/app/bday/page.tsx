import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BdayChecker from "@/components/BdayChecker";
import ArcadeFonts from "@/components/ArcadeFonts";

export const metadata: Metadata = {
  title: "Bitcoin Birthday — One Cocreation",
  description:
    "Convert your old-calendar birthday to Bitcoin Federated Time — your block, your moon, your year-animal. Runs entirely in your browser.",
};

/**
 * The Bitcoin Birthday page, wearing the site's own face (the same
 * mgmt-ground/mgmt-body cartridge the site console uses — the room keeps its
 * bones, the brand supplies the skin; see globals.css "SITE CONSOLE CHROME").
 * The interactive checker lives in BdayChecker (client); this server shell
 * carries the metadata and the chrome.
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
            The old calendar is burned — find your date on the new one. Pick your
            birthday and read it back in Bitcoin Federated Time: your block, your
            moon, your year-animal.
          </p>
        </header>
        <BdayChecker />
      </section>
      <SiteFooter />
    </main>
    </ArcadeFonts>
  );
}
