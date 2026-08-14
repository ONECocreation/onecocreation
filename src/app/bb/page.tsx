import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BbConsole from "@/components/BbConsole";

export const metadata: Metadata = {
  title: "Bitcoin Buddy — One Cocreation",
  description:
    "Meet your Bitcoin Buddy — a co-owned virtual pet born at a block and cared for with your key. Sign in with nostr to start.",
};

/**
 * /bb — the Bitcoin Buddy module, wearing the site's own face (the same
 * mgmt-ground/mgmt-body cartridge as every page); BbConsole gates the
 * content on the existing NIP-07 sign-in.
 */
export default function BbPage() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 880 }}>
        <header className="mgmt-head">
          <p className="mgmt-eyebrow">One Cocreation</p>
          <h1 className="mgmt-title">Bitcoin Buddy</h1>
          <p className="mgmt-blurb">
            A lil buddy tied to the block — co-owned with your friends, kept
            alive with your key.
          </p>
        </header>
        <div className="mt-8">
          <BbConsole />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
