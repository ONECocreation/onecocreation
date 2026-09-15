/**
 * TASK-230 (0018.06.25 a₿ · block 967,125) — THE PAGE-STATE MANIFEST: one
 * typed, greppable list of every public route and the state its copy is in.
 * The pages panel (src/components/style/PagesPanel.tsx) reads it to badge
 * every row, so the panel becomes the map of the whole site — the wave-2
 * scoreboard from the go-live plan.
 *
 * The three states:
 *   designer  — the route READS the designer's page today (a getPuckPage
 *               call in its page.tsx): the copy lives in the page designer.
 *   words     — a hand-built page; the copy lives in code (the words lanes'
 *               country). A route leaves words when its designer lane lands
 *               (T-231 moved /retreats; T-232 moves /packages).
 *   reference — kept for looking, not for living: the sixteen "-old" seeds
 *               (Love's original ShinePages pages, publishable at
 *               /p/<slug> — still editable/publishable as seeds, grouped
 *               under the panel's Archive).
 *
 * HOME IS WIRED (TASK-293, 0018.06.25 a₿ · block 967,144): src/app/page.tsx
 * now calls getPuckPage("home") first, today's hand-built sections as the
 * fallback — the /about-/retreats-/packages shape. Home wears the same
 * DESIGNER_NOTE every other wired route does; its row stays first (the
 * front door) for that reason alone, not because it's still a special case.
 *
 * The ShinePages recon's own list stays in src/lib/shinepages-recon.ts
 * (TASK-105's ONE-list law) — the panel's REFERENCE group reads it
 * directly; this manifest points, never duplicates.
 *
 * DERIVE-OR-DASH: tests/pages-panel-states.test.ts walks src/app/*\/page.tsx
 * against PAGE_STATES — every walked route appears exactly once, or is
 * dashed in ROUTE_WALK_EXCLUSIONS with its reason. The dynamic/operator
 * doors (/p/[slug], /style, /studio/overlay) sit outside the walk by
 * construction: no top-level page.tsx, nothing to dash. page-store's data
 * model stays untouched on purpose (PuckPageData is {content, root, zones?}
 * — state is a manifest concern, never a page-data field).
 *
 * Pure data, client-safe by construction (PagesPanel is a client
 * component): no fs, no env, no process.
 */

export type PageState = "designer" | "words" | "reference";

export interface PageStateEntry {
  /** the public path — "/" is home, the "-old" seeds publish at /p/<slug> */
  path: string;
  state: PageState;
  /** the puck slug where one exists (the designer/archive rows key off it) */
  slug?: string;
  /** the honest one-liner the panel's badge tooltip speaks */
  note: string;
}

const DESIGNER_NOTE = "designer — the live route reads the designer's page; the copy lives in the designer";
const REFERENCE_NOTE = "reference — Love's original ShinePages page, kept as a seed under Archive; still editable and publishable, not the live face";

export const PAGE_STATES: PageStateEntry[] = [
  /* the front door first, then designer + words in route-alphabetical
     order, then the reference shelf in seed order */
  { path: "/", slug: "home", state: "designer", note: DESIGNER_NOTE },
  { path: "/about", slug: "about", state: "designer", note: DESIGNER_NOTE },
  { path: "/artist", slug: "artist", state: "designer", note: DESIGNER_NOTE },
  { path: "/bday", slug: "bday", state: "designer", note: DESIGNER_NOTE },
  { path: "/book", slug: "book", state: "designer", note: DESIGNER_NOTE },
  { path: "/classes", slug: "classes", state: "designer", note: DESIGNER_NOTE },
  { path: "/contact", slug: "contact", state: "designer", note: DESIGNER_NOTE },
  { path: "/jewelry", slug: "jewelry", state: "designer", note: DESIGNER_NOTE },
  { path: "/media", slug: "media", state: "designer", note: DESIGNER_NOTE },
  { path: "/meditation", slug: "meditation", state: "designer", note: DESIGNER_NOTE },
  { path: "/memberships", slug: "memberships", state: "designer", note: DESIGNER_NOTE },
  { path: "/news", slug: "news", state: "designer", note: DESIGNER_NOTE },
  { path: "/packages", slug: "packages", state: "designer", note: DESIGNER_NOTE },
  { path: "/privacy", slug: "privacy", state: "designer", note: DESIGNER_NOTE },
  { path: "/retreats", slug: "retreats", state: "designer", note: DESIGNER_NOTE },
  { path: "/services", slug: "services", state: "designer", note: DESIGNER_NOTE },
  { path: "/store", slug: "store", state: "designer", note: DESIGNER_NOTE },
  { path: "/support", slug: "support", state: "designer", note: DESIGNER_NOTE },
  { path: "/terms", slug: "terms", state: "designer", note: DESIGNER_NOTE },

  { path: "/bb", state: "words", note: "words — Bitcoin Buddy; copy lives in code" },
  { path: "/cart", state: "words", note: "words — the basket; copy lives in code (a checkout surface, not a designer candidate by default)" },
  { path: "/letters", state: "words", note: "words — Your Letters; copy lives in code" },
  { path: "/live", state: "words", note: "words — the live page; copy lives in code" },
  { path: "/login", state: "words", note: "words — the sign-in door; copy lives in code (an app surface, not a designer candidate by default)" },
  { path: "/me", state: "words", note: "words — the member's own room; copy lives in code (an app surface, not a designer candidate by default)" },
  { path: "/time", state: "words", note: "words — the clock (Bitcoin Federated Time); copy lives in code — T-295 pair 6 flagged-and-stopped on the live BFT read (the data-bound block lane lands it)" },
  { path: "/welcome", state: "words", note: "words — the welcome page; copy lives in code" },

  { path: "/p/home-old", slug: "home-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/about-old", slug: "about-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/memberships-old", slug: "memberships-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/consciouscuts-old", slug: "consciouscuts-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/contact-old", slug: "contact-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/gallaria-old", slug: "gallaria-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/thank-you-old", slug: "thank-you-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/book-a-call-old", slug: "book-a-call-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/weekly-intuitive-old", slug: "weekly-intuitive-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/links-old", slug: "links-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/evening-star-old", slug: "evening-star-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/leap-of-faith-old", slug: "leap-of-faith-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/thank-you-morning-meditation-old", slug: "thank-you-morning-meditation-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/thank-you-large-sums-old", slug: "thank-you-large-sums-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/thank-you-iam-worthy-old", slug: "thank-you-iam-worthy-old", state: "reference", note: REFERENCE_NOTE },
  { path: "/p/observer-old", slug: "observer-old", state: "reference", note: REFERENCE_NOTE },
];

/** The sixteen "-old" seed slugs, in seed order — the panel's Archive
    group. The walk test derives the same set from SEEDS and pins this
    list against it, so a seventeenth seed can't slip in ungrouped. */
export const ARCHIVE_SEEDS: readonly string[] = PAGE_STATES
  .filter((e) => e.state === "reference" && e.slug)
  .map((e) => e.slug as string);

/** The deliberate dashes: walked segments that are NOT site pages, each
    with its reason. The coverage test fails on any walked segment that is
    neither in PAGE_STATES nor dashed here. */
export const ROUTE_WALK_EXCLUSIONS: Readonly<Record<string, string>> = {
  a: "the operator console — the /a rooms are tools, not site pages",
  api: "endpoints, not pages — nothing to design",
};

const BY_PATH = new Map(PAGE_STATES.map((e) => [e.path, e]));
const BY_SLUG = new Map(PAGE_STATES.filter((e) => e.slug).map((e) => [e.slug as string, e]));

/** the manifest entry for a public path ("/about"), or null when the
    manifest doesn't know it — the panel shows no badge rather than a lie */
export function pageStateEntryForPath(path: string): PageStateEntry | null {
  return BY_PATH.get(path) ?? null;
}

/** the manifest entry for a puck slug ("about", "home-old") — falling back
    to the path lookup so an operator-made page at a words route ("jewelry")
    still wears its words badge; null when the manifest has never heard of
    the slug (the panel shows no badge rather than a guessed one) */
export function pageStateEntryForSlug(slug: string): PageStateEntry | null {
  return BY_SLUG.get(slug) ?? BY_PATH.get(`/${slug}`) ?? null;
}

/** is this slug one of the sixteen archive seeds? */
export function isArchiveSlug(slug: string): boolean {
  return ARCHIVE_SEEDS.includes(slug);
}
