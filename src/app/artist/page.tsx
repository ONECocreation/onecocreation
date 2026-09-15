import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import ArtistRegistry from "@/components/ArtistRegistry";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
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

export default async function ArtistPage() {
  /* TASK-135: the pacsarcade Artist Registry / claim-a-tag flow isn't a
     ONE Cocreation feature — this tenant's real profile surface is /me.
     The component stays (template heritage, other clones may run it);
     only this tenant's door is gated.
     TASK-295: the gate stays FIRST (the T-232 idiom — route gates before
     the Puck read), so on this tenant the designer's page is never even
     consulted: /artist is always the redirect door here. */
  if (TENANT === "onecocreation") {
    redirect("/me");
  }
  /* TASK-295 (0018.06.25 a₿) — PUCK first, mirroring /about (page.tsx:68-88)
     byte-for-byte: once the Puck rebuild is published (/style/artist ->
     Publish), the live /artist serves it (on tenants where the door opens).
     Until then, the registry below is untouched. The registry itself is a
     session-gated, API-backed app — per-soul state no static doc can hold —
     so it stays code-side; the seed carries its static header verbatim and
     says so. */
  const puck = await getPuckPage("artist");
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
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 880 }}>
        <ArtistRegistry />
      </section>
      <SiteFooter />
    </main>
  );
}
