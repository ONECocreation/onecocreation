import PageHero from "@/components/kit/PageHero";

/**
 * PageHero block (TASK-645, block 975,980) — the designer's door to the
 * house top. It renders the kit part itself (src/components/kit/PageHero),
 * so a page Love edits wears the same night galaxy, the same stars and the
 * same padding as /book and /contact. LOCAL block, like ParallaxBand: the
 * vendored package stays untouched.
 *
 * The words are Love's own blocks in the slot (Eyebrow, Heading or Stacked
 * heading, the emoji line, Text), so the publish rails read her H1 where
 * they always have, and she edits the words the way she edits every band.
 * Root-only, like Band: its slot refuses the full-width blocks, and the
 * shim in puck-config.tsx adds "PageHero" to every package slot that
 * already refuses "Band".
 */
interface PageHeroBlockProps {
  /* the field STORES a slot data array; Puck hands render a ready component */
  content: React.ComponentType;
}

export function createPageHero() {
  return {
    label: "Page top (night galaxy)",
    fields: {
      content: { type: "slot" as const, disallow: ["Band", "Hero", "ParallaxBand", "PageHero"] },
    },
    defaultProps: { content: [] },
    render: ({ content: Content }: PageHeroBlockProps) => (
      <PageHero>
        <Content />
      </PageHero>
    ),
  };
}
