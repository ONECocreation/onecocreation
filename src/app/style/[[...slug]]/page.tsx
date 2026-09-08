import type { Metadata } from "next";
import { headers } from "next/headers";
import type { Data } from "@puckeditor/core";
import OperatorGate from "@/components/OperatorGate";
import StyleEditor from "@/components/style/StyleEditor";
import PaletteVars from "@/components/PaletteVars";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { getPuckDraft, getPuckPage } from "@/lib/puck-store";
import { SEEDS } from "@/lib/puck-seeds";

/**
 * STYLE — the Puck visual-editor pilot, moved out of /a for PUCK P2
 * (full-screen break-out, Admiral-approved 2026-08-10). Puck ships its own
 * full-app editor (canvas + COMPONENTS/OUTLINE rail + fields rail) that
 * wants the whole viewport — /a/studio/[[...slug]] (P1) rendered it inside
 * the console shell instead, squeezing it into the console's content strip.
 * This route lives at the top level with its own minimal layout
 * (src/app/style/layout.tsx: no SiteHeader, no console chrome) so the
 * editor owns 100vw x 100vh. Still operator-gated exactly like every /a
 * room: no operator cookie, no editor — OperatorGate renders bare instead.
 * /a/studio (src/app/a/studio/[[...slug]]/page.tsx) is now a thin redirect
 * here so the designer stays discoverable from the console.
 *
 * TASK-175 (naming ruling, Admiral 0018.06.17 a₿, block 966094): the page
 * designer is STYLE (StylePac) — the route moved /studio → /style so "the
 * studio" names only StudioPac, the VDO.Ninja go-live fork. next.config.ts
 * carries one PERMANENT redirect /studio/* → /style/* for old bookmarks
 * and letters.
 *
 * /style            → edits the "home" slug
 * /style/pilot      → edits the "pilot" slug (catch-all optional segment)
 *
 * TASK-97 PROP-LIFT (cut 0018.06.10 a₿): the page renders StyleEditor,
 * the client wiring bridge that feeds PuckEditor its puck-config, seeds,
 * brand tokens and Copilot as props — the editor itself is brand-neutral.
 */
export const metadata: Metadata = {
  title: "Style — One Cocreation admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const EMPTY_DATA: Data = { content: [], root: {} };

export default async function StylePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    return <OperatorGate configured={operatorsConfigured()} />;
  }

  const { slug: slugParts } = await params;
  const slug = slugParts?.join("/") || "home";
  // resume the working draft; else what's live; else a page seed (P4 opens
  // /style/about pre-populated with the rebuilt page); else empty
  const draft = await getPuckDraft(slug);
  const live = await getPuckPage(slug);
  const seed = SEEDS[slug] as Data | undefined;
  const data: Data = ((draft ?? live ?? seed) as Data | null) ?? EMPTY_DATA;

  return (
    <>
      <PaletteVars />
      <StyleEditor slug={slug} data={data} />
    </>
  );
}
