import type { Metadata } from "next";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";
import { FreeMeditation } from "@/components/sections";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";

export const metadata: Metadata = {
  title: "Free Meditation — One Cocreation",
  description: "A free guided meditation from Love — on the house, from our 💞 to yours.",
};

/* TASK-295 (0018.06.25 a₿): the page reads its Puck doc from KV now, so it
   carries the same force-dynamic line /about got under TASK-239 — without
   it `next build` would prerender a static snapshot and a published rebuild
   would never reach a real visitor until the next deploy. */
export const dynamic = "force-dynamic";

/* The free meditation wears two doors (Admiral, 0018.05.16): a section on
 * the main page AND its own page — same pattern as About. */
export default async function MeditationPage() {
  /* TASK-295 (0018.06.25 a₿) — PUCK first, mirroring /about (page.tsx:68-88)
     byte-for-byte: once Love publishes the Puck rebuild (/style/meditation ->
     Publish), the live /meditation serves it. Until then, the hand-built
     section below is untouched — nothing changes for visitors until she
     chooses it. No route gates on this page (no features.* switches read). */
  const puck = await getPuckPage("meditation");
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

  return (<><SiteHeader /><main><FreeMeditation /></main><SiteFooter /></>);
}
