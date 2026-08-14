import { createConfig, LinkPickerField } from "@pacsarcade/puck-config";
import { cartridge } from "@/brand/cartridge";
import { ONECOCREATION } from "@/brand/tokens";
import MediaField from "@/components/studio/MediaField";

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

export const config = createConfig({
  assets: {
    nebula: cartridge.hero.nebula,
    meteors: cartridge.hero.meteors,
  },
  /* separation law: the package is brand-neutral — Love's brand enters
     here, from her own repo, and nowhere else */
  tokens: ONECOCREATION,
  /* image URL fields get the git-backed library (upload + browse) */
  mediaField: ({ value, onChange }) => (
    <MediaField value={value ?? ""} onChange={onChange} />
  ),
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

export default config;
