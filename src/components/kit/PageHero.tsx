import type { ReactNode } from "react";
import CosmicSky from "@/components/CosmicSky";
import StackedHero from "@/components/StackedHero";

/**
 * kit PageHero (TASK-645, block 975,980) — the house top as ONE part: the
 * night galaxy ground (`keep-dark sky-veil`, so it holds the night at dawn
 * too), the living stars (CosmicSky), then the words. Twelve route files
 * carried this markup by hand (/contact's copy is the reference); this is
 * the same section with the inline padding and positioning moved into
 * kit.css's `kit-page-hero*` rules. It reads the tokens and adds none.
 *
 * Two ways to fill it, one ground:
 *  - `lines` (with `kicker`, `constellation`, `lead`): the stacked heading
 *    every hand copy wears, drawn by the shared StackedHero; the lead sits
 *    under the glyph line in the house `.lead` voice.
 *  - `children`: any words the caller brings, in a centred 680 px column.
 *    The designer block (src/lib/puck-blocks/page-hero.tsx) puts Love's own
 *    blocks here, so a page she edits wears the same top.
 */
export interface KitPageHeroProps {
  kicker?: string;
  kickerTone?: "teal";
  lines?: { t: string; tone?: "ink" | "teal" | "amp" | "sub" | "rose" }[];
  constellation?: boolean;
  lead?: ReactNode;
  children?: ReactNode;
}

export default function PageHero({ kicker, kickerTone, lines, constellation, lead, children }: KitPageHeroProps) {
  return (
    <section className="keep-dark sky-veil kit-page-hero">
      <CosmicSky />
      <div className="wrap center reveal kit-page-hero-inner">
        {lines && lines.length > 0 ? (
          <StackedHero kicker={kicker} kickerTone={kickerTone} lines={lines} constellation={constellation}>
            {lead ? <p className="lead kit-page-hero-lead">{lead}</p> : null}
          </StackedHero>
        ) : null}
        {children ? <div className="kit-page-hero-words">{children}</div> : null}
      </div>
    </section>
  );
}
