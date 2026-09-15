import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BbConsole from "@/components/BbConsole";
import DisplayFonts from "@/components/DisplayFonts";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";

/* TASK-296 (0018.06.25 a₿): the page reads its Puck doc from KV now, so it
   carries the same force-dynamic line /about got under TASK-239 — without
   it `next build` would prerender a static snapshot and a published rebuild
   would never reach a real visitor until the next deploy. */
export const dynamic = "force-dynamic";

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
export default async function BbPage() {
  /* TASK-296 wave B, pair bb-time — PUCK first, mirroring /about
     (page.tsx:68-88) byte-for-byte: once Love publishes the Puck rebuild
     (/style/bb -> Publish), the live /bb serves it. Until then, the
     hand-built page below is untouched — nothing changes for visitors
     until she chooses it. No route gates on this page (no features.*
     switches read). The console is never frozen either way: the designer
     branch renders it through the { id }-only BbConsole block, client-live
     exactly like the fallback's. */
  const puck = await getPuckPage("bb");
  if (puck) {
    return (
      <>
        <SiteHeader />
        <PaletteVars />
        <main><Render config={config} data={puck as Data} /></main>
        <SiteFooter />
        {/* STUDIO P2: the popup host rides the designer branch (the fallback
            never had one — byte-identical law — so it is not added there) */}
        <PopupHost />
      </>
    );
  }

  return (
    <DisplayFonts>
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
    </DisplayFonts>
  );
}
