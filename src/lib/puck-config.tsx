import { createConfig, LinkPickerField } from "@pacsarcade/puck-config";
import { cartridge } from "@/brand/cartridge";
import { ONECOCREATION } from "@/brand/tokens";
import MediaField from "@/components/studio/MediaField";
import { createParallaxBand } from "@/lib/puck-blocks/parallax-band";

/**
 * Puck config — now a thin shim over the fleet's shared registry
 * (@pacsarcade/puck-config, extracted in Puck Fork Robustness Plan Phase 0
 * Task 3; source of truth: puck-studio/packages/puck-config). The house
 * blocks, Style Inspector fields, and ColorField all live in the package;
 * this file only injects One Cocreation's brand assets. Every existing
 * import path (@/lib/puck-config) is unchanged — zero behavior change.
 *
 * KEEP IN LOCKSTEP: src/lib/copilot.ts COMPONENTS mirrors the registry the
 * package exports — when the package gains blocks, mirror the text/copy ones
 * there so Number One can place them.
 *
 * Updating the package: bump the release URL in package.json (see
 * puck-studio/packages/puck-config/README.md for the pack→release flow).
 */

const mediaField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <MediaField value={value ?? ""} onChange={onChange} />
);

const base = createConfig({
  assets: {
    nebula: cartridge.hero.nebula,
    meteors: cartridge.hero.meteors,
  },
  /* separation law: the package is brand-neutral — Love's brand enters
     here, from her own repo, and nowhere else */
  tokens: ONECOCREATION,
  /* image URL fields get the git-backed library (upload + browse) */
  mediaField,
  /* href fields get the page picker: real site routes + studio drafts */
  linkField: ({ value, onChange }) => (
    <LinkPickerField
      value={value ?? ""}
      onChange={onChange}
      sources={{
        staticRoutes: [
          { label: "Home", path: "/" },
          { label: "About", path: "/about" },
          { label: "Book a session", path: "/book" },
          { label: "Classes & community", path: "/classes" },
          { label: "Memberships", path: "/memberships" },
          { label: "Store", path: "/store" },
          { label: "Support", path: "/support" },
        ],
        fetchPages: () => fetch("/api/puck").then((r) => r.json()).then((d) => (Array.isArray(d.pages) ? d.pages : [])),
        pagePath: (slug) => (slug === "home" ? "/" : `/p/${slug}`),
      }}
    />
  ),
});

/* STUDIO P2 (ALT-2A ruled): ParallaxBand is a LOCAL block — the package
   stays vendored-untouched. To keep it root-only like the package's
   NO_FULL_WIDTH law, every package slot whose disallow list bans "Band"
   gets a NEW list that also bans "ParallaxBand" (fresh objects — the
   package's own arrays are never mutated). */
const components = Object.fromEntries(
  Object.entries(base.components).map(([key, comp]) => [
    key,
    {
      ...comp,
      fields: Object.fromEntries(
        Object.entries(comp.fields ?? {}).map(([fk, field]) => [
          fk,
          field.type === "slot" && Array.isArray(field.disallow) && field.disallow.includes("Band")
            ? { ...field, disallow: [...field.disallow, "ParallaxBand"] }
            : field,
        ]),
      ),
    },
  ]),
);
components.ParallaxBand = createParallaxBand({
  assets: { nebula: cartridge.hero.nebula, meteors: cartridge.hero.meteors },
  mediaField,
}) as unknown as (typeof components)[string];

/* the library rail: ParallaxBand joins the Layout group, appended at the
   end (after Divider — the package's array order is never reordered) */
const categories = base.categories as Record<string, { title?: string; components?: string[]; defaultExpanded?: boolean }>;
const layout = categories.layout ?? {};

export const config = {
  ...base,
  components,
  categories: {
    ...categories,
    layout: { ...layout, components: [...(layout.components ?? []), "ParallaxBand"] },
  },
  /* STUDIO P1: page-level SEO lives on the Puck root — plain fields edited
     through Puck.Fields' root section; the registry's root RENDER stays the
     page content, /p/<slug>'s generateMetadata reads these (cartridge.meta
     is the fallback). Reads tolerate `root: {}` (Puck migrates to
     root.props on the next save). */
  root: {
    fields: {
      title: { type: "text" as const, label: "Page title (SEO)" },
      description: { type: "textarea" as const, label: "Description (SEO / social)" },
      ogImage: { type: "text" as const, label: "Social image URL (optional)" },
    },
  },
};

export default config;
