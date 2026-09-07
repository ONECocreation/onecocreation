import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ArtistRegistry from "@/components/ArtistRegistry";
import { TENANT } from "@/lib/tenant";

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
  /* TASK-135: the pacsarcade Artist Registry / claim-a-tag flow isn't a
     ONE Cocreation feature — this tenant's real profile surface is /me.
     The component stays (template heritage, other clones may run it);
     only this tenant's door is gated. */
  if (TENANT === "onecocreation") {
    redirect("/me");
  }
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
