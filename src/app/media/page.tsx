import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import MediaKit from "@/components/MediaKit";
import DisplayFonts from "@/components/DisplayFonts";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";

/**
 * /media — the MEDIA / ASSETS page: copy-to-clipboard bitcoin glyphs
 * (₿, the sat mark, a₿ / b₿ / ★, ⚡), the One Cocreation brand assets (mark,
 * wordmark, palette), and a press blurb. So nobody has to leave home to grab
 * a ₿. Gold rides money only.
 */
export const metadata: Metadata = {
  title: "Media & assets — One Cocreation",
  description:
    "Copy bitcoin glyphs (₿, sats, a₿, ★, ⚡) and One Cocreation brand assets — the mark, wordmark, palette, and a press blurb. No trip to emojipedia required.",
};

/* TASK-295 (0018.06.25 a₿): the page reads its Puck doc from KV now, so it
   carries the same force-dynamic line /about got under TASK-239 — without
   it `next build` would prerender a static snapshot and a published rebuild
   would never reach a real visitor until the next deploy. */
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  /* TASK-295 (0018.06.25 a₿) — PUCK first, mirroring /about (page.tsx:68-88)
     byte-for-byte: once the Puck rebuild is published (/style/media ->
     Publish), the live /media serves it. Until then, the hand-built kit
     below is untouched. No route gates on this page (no features.* switches
     read). The kit's words are all static (seeded verbatim); its click-to-
     copy behaviour stays code-side — the seed says so. */
  const puck = await getPuckPage("media");
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
    <DisplayFonts>
      <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 880 }}>
        <MediaKit />
      </section>
      <SiteFooter />
    </main>
    </DisplayFonts>
  );
}
