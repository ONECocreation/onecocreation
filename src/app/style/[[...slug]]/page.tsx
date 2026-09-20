import type { Metadata } from "next";
import { headers } from "next/headers";
import type { Data } from "@puckeditor/core";
import OperatorGate from "@/components/OperatorGate";
import StyleEditor from "@/components/style/StyleEditor";
import PaletteVars from "@/components/PaletteVars";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { getPuckDraft, getPuckPage } from "@/lib/puck-store";
import { SEEDS } from "@/lib/puck-seeds";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { tierForSubject } from "@/lib/member-tier";
import { Hero } from "@/components/sections";

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

  /* TASK-346 LANE A (0018.07.02 a₿) — option 1 (the Admiral's ruling
     0018.06.28 a₿): the preview hero mounted on the /style home canvas
     shows the BUILDER'S OWN visitor/member session, read exactly the way
     src/app/page.tsx:34-37 reads it, applied to the SAME raw cookie header
     already read above for operator resolution — no new cookie-reading
     code, per the brief's Build step 1. */
  const active = sessionsFromCookieHeader(cookie)[0] ?? null;
  const session = active
    ? { handle: active.handle, space: active.space, tier: await tierForSubject(`${active.handle}@${active.space}`) }
    : null;

  /* GROUND GAP FOUND WHILE BUILDING, not in the brief's own Ground work:
     src/components/sections.tsx has NO "use client" directive and its
     module-level siblings (src/lib/booking.ts, src/lib/store.ts,
     src/lib/site-config.ts — all imported at the top of sections.tsx)
     import Node built-ins (fs, path) and redis/nodemailer transitively.
     On the live / route this is fine: page.tsx is a server component, so
     Hero's whole module graph runs server-side only. But PuckEditor.tsx
     (and everything it renders, including this lane's overrides.iframe
     Frame) is "use client" — if a client file imported Hero directly,
     Next's bundler would have to pull sections.tsx's ENTIRE module graph
     into the browser bundle (confirmed: `npx next build` fails with 20+
     "Module not found: fs/net/tls/dns/child_process" errors tracing
     through src/lib/store.ts → nodemailer → the browser chunk). The fix:
     render Hero HERE, server-side, exactly like page.tsx's own <Hero
     session={session}/> — and pass the finished element down through the
     client tree as an opaque ReactNode prop (the standard Next.js
     "Server Component passed as a Client Component's prop" composition
     pattern). No client file ever imports sections.tsx; Hero stays
     entirely read-only, unmodified — this only moves WHERE it is
     instantiated, from the brief's Build step 4 (PreviewHero.tsx) to
     here, one layer up. */
  const previewHero = <Hero session={session} />;

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
      <StyleEditor slug={slug} data={data} operator={operator} previewHero={previewHero} />
    </>
  );
}
