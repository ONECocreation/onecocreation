import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ArtistRegistry from "@/components/ArtistRegistry";

/**
 * The artist door — gated behind the artist-training entitlement; inside:
 * request your name on the Spaces protocol, read the live auction board,
 * watch names per-npub.
 */
export const metadata: Metadata = {
  title: "Artist Registry — One Cocreation",
  description:
    "Request your name on the Spaces protocol, watch the auction board, keep your names in sight — the artist door of One Cocreation.",
};

export const dynamic = "force-dynamic";

export default function ArtistPage() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 880 }}>
        <ArtistRegistry />
      </section>
      <SiteFooter />
    </main>
  );
}
