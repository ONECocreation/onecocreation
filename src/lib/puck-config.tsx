import { createConfig, LinkPickerField } from "@frens-earth/puck-config";
import { cartridge } from "@/brand/cartridge";
import { ONECOCREATION } from "@/brand/tokens";
import MediaField from "@/components/style/MediaField";
import { createParallaxBand } from "@/lib/puck-blocks/parallax-band";
import { createJoinSurface } from "@/lib/puck-blocks/join-surface";
import { createFormDoors } from "@/lib/puck-blocks/form-doors";
import { createRetreatsList } from "@/lib/puck-blocks/retreats-list";
import { createPackagesGrid } from "@/lib/puck-blocks/packages-grid";
import { createLettersRoom } from "@/lib/puck-blocks/letters-room";
import { createCartPanel } from "@/lib/puck-blocks/cart-panel";
import { createMeSwitch } from "@/lib/puck-blocks/me-switch";
import { createLoginDoor } from "@/lib/puck-blocks/login-door";
import { createBbConsole } from "@/lib/puck-blocks/bb-console";
import { createBftClock } from "@/lib/puck-blocks/bft-clock";
import { NIP05_DOMAIN, SPACE_NAME } from "@/lib/identity-config";

/**
 * Puck config — now a thin shim over the fleet's shared registry
 * (@frens-earth/puck-config, extracted in Puck Fork Robustness Plan Phase 0
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
          { label: "Packages", path: "/packages" },
          { label: "Retreats", path: "/retreats" },
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

/* STUDIO P3 (ALT-2A ruled): the Join surface + the form doors are LOCAL
   blocks binding this repo's existing claim machinery (TagClaim, the
   Doors, the brand contract) — the package stays vendored-untouched. The
   space binding comes from identity-config, so a fork re-points it with
   its own NEXT_PUBLIC_SPACE_NAME / NEXT_PUBLIC_NIP05_DOMAIN. */
components.JoinSurface = createJoinSurface({
  space: SPACE_NAME,
  nip05Domain: NIP05_DOMAIN,
}) as unknown as (typeof components)[string];
components.FormDoors = createFormDoors() as unknown as (typeof components)[string];

/* TASK-231 (0018.06.24 a₿ · block 967,070): RetreatsList — the house's
   FIRST data-bound block (the live retreat shelf; the shelf itself is
   injected at render time by applyRetreatsToPuck on the published page —
   see the block's docblock for why it isn't an async server component).
   LOCAL, like P2/P3 — the package stays vendored-untouched. */
components.RetreatsList = createRetreatsList() as unknown as (typeof components)[string];

/* TASK-232 (0018.06.25 a₿ · block 967,125): PackagesGrid — the second
   data-bound block, riding T-231's pattern (the live tier grid; the shelf —
   TIERS × TIER_PAGES × the store switch — is injected at render time by
   applyPackagesToPuck on the published page; see the block's docblock).
   LOCAL, like its siblings — the package stays vendored-untouched. */
components.PackagesGrid = createPackagesGrid() as unknown as (typeof components)[string];

/* TASK-296 wave B, letters-cart pair (0018.06.25 a₿ · block ~967,200):
   LettersRoom + CartPanel — the rubric-3 data-bound blocks (the
   RetreatsList/PackagesGrid shape): the stored doc holds only the id; the
   server-judged props (the public-letters shelf, the payment rails) are
   injected at render time by applyLettersToPuck / applyCartRailsToPuck on
   the published page (see each block's docblock). LOCAL, like their
   siblings — appended, never reordered (the wave B union-merge law). */
components.LettersRoom = createLettersRoom() as unknown as (typeof components)[string];
components.CartPanel = createCartPanel() as unknown as (typeof components)[string];
/* TASK-296 wave B, me-login pair (0018.06.25 a₿ · block ~967,192): MeSwitch
   + LoginDoor — the { id }-only blocks (the JoinSurface/FormDoors shape):
   the stored doc holds only the id, the block renders the real session-
   aware widget on the published page AND the designer canvas (see each
   block's docblock). LOCAL, like their siblings — appended, never reordered
   (the wave B union-merge law). */
components.MeSwitch = createMeSwitch() as unknown as (typeof components)[string];
components.LoginDoor = createLoginDoor() as unknown as (typeof components)[string];
/* TASK-296 wave B, pair bb-time (0018.06.25 a₿): BbConsole + BftClock — the
   { id }-only data-bound blocks (the GO §2 rubric line 2): self-contained
   CLIENT widgets (NIP-07/session/localStorage for the buddy console; the
   client-live BFT read, live-or-dashes, for the clock), so nothing is
   injected server-side and nothing fossilises — the stored docs carry only
   the id. LOCAL, like their siblings — the package stays vendored-untouched.
   Appended, never reordered (the wave B append-only law). */
components.BbConsole = createBbConsole() as unknown as (typeof components)[string];
components.BftClock = createBftClock() as unknown as (typeof components)[string];

/* the library rail: ParallaxBand (and the data-bound blocks, TASK-231's
   RetreatsList + TASK-232's PackagesGrid) join the Layout group, appended
   at the end (after Divider — the package's array order is never reordered) */
const categories = base.categories as Record<string, { title?: string; components?: string[]; defaultExpanded?: boolean }>;
const layout = categories.layout ?? {};
/* P3's binding blocks join the Actions group, appended the same way */
const actions = categories.actions ?? {};

export const config = {
  ...base,
  components,
  categories: {
    ...categories,
    layout: { ...layout, components: [...(layout.components ?? []), "ParallaxBand", "RetreatsList", "PackagesGrid", "LettersRoom", "CartPanel"] },
    actions: { ...actions, components: [...(actions.components ?? []), "JoinSurface", "FormDoors", "MeSwitch", "LoginDoor", "BbConsole", "BftClock"] },
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
