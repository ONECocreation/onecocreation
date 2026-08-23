#!/usr/bin/env node
/**
 * bench-seed.mjs — the studio demo bench's seed data (TASK-24/S26 lane 2,
 * 0018.06.01 a₿, block 963,692). Pac opens the studio on his own machine —
 * no cloud, no KV, no GitHub assets repo — and the room must not be empty.
 *
 * What it does: WIPES bench-data/ and rebuilds it with demo content in the
 * EXACT format of the S19 filesystem page-store driver
 * (packages/page-store/src/fs-driver.ts): one file per key, the key
 * encodeURIComponent'd into the filename (colons land as %3A), string values
 * as raw file contents, sets as JSON arrays. The store finds these files
 * when the bench boots with:
 *
 *   PUCK_STORE_DRIVER=filesystem PUCK_STORE_FS_DIR=bench-data
 *
 * (the `studio:bench` command sets those — this script only writes the
 * format). Usage, from the repo root:
 *
 *   node scripts/bench-seed.mjs
 *
 * Idempotent BY CONSTRUCTION: the directory is deleted and rewritten from
 * deterministic content (no clock, no randomness), so run two produces
 * byte-identical files. Pac can reseed any time to get a clean bench back.
 *
 * What gets seeded (LIVE pages + the index; drafts stay empty so the
 * studio's draft ?? live ?? seed resolution opens these as-is):
 *
 *   puck:page:home            — the welcome page: Band + StackedHeading +
 *                               Image + RichText + Buttons — something to
 *                               move, edit, restyle
 *   puck:page:memberships     — tier cards: ThreeColumns of Panels, Lists,
 *                               a Faq — structured content to poke
 *   puck:page:field-notes     — a content page: TwoColumns + Gallery + Video
 *   puck:page:popup:bench-note — a popup document, so the overlay system has
 *                               a real fragment to render
 *   puck:pages                — the index SET (JSON array, as sadd writes it)
 *   puck:page-order           — the pages panel's display order
 *   puck:popup-config         — one real trigger override, so the popups
 *                               panel has something to toggle
 *
 * Every block type + prop below is spelled against the ACTUAL puck config
 * (node_modules/@pacsarcade/puck-config/src/index.tsx) — a seed that names a
 * nonexistent block breaks the editor. THE NEUTRALITY LAW (S29 — the
 * Admiral's ruling: a clean template carries no branding): no wordmarks,
 * no Love's copy, no Love's art. Every image is a labeled ASSET SLOT under
 * /images/blank/ — the blank cartridge's own convention: the slots are
 * labeled, the 404s are the truth (NO new binaries — check:leaks stays
 * clean). Bands are "plain" and follow the theme: the sky-* backgrounds
 * and the keep-dark night are Love's own, baked into cartridge.css —
 * seeds never call them. The video slot is honestly empty: a template
 * borrows no one's film. The content is neutral demo content in the house
 * voice — a bench, not a brand; the one date stamp is BFT (0018.06.01 a₿
 * = block 963,692, the mempool.space tip at authoring — days 1–28, months
 * 1–13, per house time law).
 */
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "bench-data");

/* ── the block kit — the same vocabulary src/lib/puck-seeds.ts uses, so a
     bench page is shaped exactly like a P4 seed (Puck data: content[] of
     { type, props: { id, … } }, slot content nested in props, root.props
     carrying the honest SEO meta) ─────────────────────────────────────── */
const DS = { font: "default", size: 0, kerning: 0, lineHeight: 0, color: "default", spaceAbove: 0, spaceBelow: 0 };
const st = (o = {}) => ({ ...DS, ...o });

const kit = (prefix) => {
  let i = 0;
  const mk = (type, props = {}) => ({ type, props: { id: `${prefix}-${i++}`, ...props } });
  return {
    eyebrow: (text, align = "left") => mk("Eyebrow", { text, align, style: st() }),
    heading: (text, level = "h2", align = "left", style = st()) => mk("Heading", { text, level, align, style }),
    stacked: (line1, line2, tag = "h2", align = "center") => mk("StackedHeading", { line1, line2, tag, align, style: st() }),
    text: (t, align = "left", style = st()) => mk("Text", { text: t, align, style }),
    rich: (html, align = "left", style = st()) => mk("RichText", { html, align, style }),
    quote: (t, align = "center", style = st()) => mk("PullQuote", { text: t, align, style }),
    note: (t) => mk("Note", { text: t }),
    faq: (items) => mk("Faq", { items }),
    card: (title, body) => mk("Card", { title, body }),
    img: (src, alt, width = 320, radius = "soft", align = "center") => mk("Image", { src, alt, width, radius, align }),
    gallery: (images, tilt = "yes") => mk("Gallery", { images, tilt }),
    video: (youtube, ratio = "16/9") => mk("Video", { youtube, ratio }),
    list: (items, marker = "check", align = "left") => mk("List", { marker, align, items: items.map((text) => ({ text })) }),
    button: (label, href, variant = "gold", align = "left") => mk("Button", { label, href, variant, align, style: st() }),
    buttons: (list, align = "center") => mk("Buttons", { align, buttons: list }),
    panel: (content) => mk("Panel", { content }),
    twocol: (left, right, gap = 26, valign = "top") => mk("TwoColumns", { gap, valign, left, right }),
    threecol: (a, b, c, gap = 22, valign = "top") => mk("ThreeColumns", { gap, valign, a, b, c }),
    band: (background, hold, content) => mk("Band", { background, hold, content }),
    spacer: (height = 40) => mk("Spacer", { height }),
    divider: (width = 220) => mk("Divider", { width }),
  };
};

/* ── page 1 · home — the welcome mat: a Band to restyle, an Image to swap,
     rich text to edit, buttons to re-point ────────────────────────────── */
const hm = kit("bench-home");
const homeContent = [
  hm.band("plain", "theme", [
    hm.eyebrow("The studio bench", "center"),
    hm.stacked("THE STUDIO", "BENCH", "h1", "center"),
    hm.text("A local proving ground. No cloud, no KV, no assets repo — everything below lives in bench-data/ on this machine.", "center", st({ size: 18, spaceAbove: 6 })),
    hm.img("/images/blank/heaven-earth.webp", "ASSET SLOT — the hero art belongs to the next community; the slot 404s honestly until it lands", 520, "soft", "center"),
    hm.buttons([
      { label: "See the tier cards →", href: "/p/memberships", variant: "gold" },
      { label: "Read the field notes", href: "/p/field-notes", variant: "quiet" },
    ], "center"),
  ]),
  hm.band("plain", "theme", [
    hm.heading("What this bench is for", "h2"),
    hm.rich("Three demo pages and one popup ride this seed — real pages at <b style=\"color:var(--teal-bright)\">/p/home</b>, <b style=\"color:var(--teal-bright)\">/p/memberships</b> and <b style=\"color:var(--teal-bright)\">/p/field-notes</b>, each one open for editing in the studio. Move a block, restyle a heading, repoint a button: the draft autosaves to the filesystem, and Publish copies it live."),
    hm.list([
      "Drag blocks between the canvas and the outline rail",
      "Open the Style inspector on any text block — font, size, kerning, colour",
      "Reorder pages in the pages panel; the order persists",
      "Toggle the popup in the popups panel, then reload /p/home",
    ]),
    hm.quote("The bench is a workbench, not a stage — everything on it is meant to be taken apart."),
    hm.divider(),
    hm.note("Seeded 0018.06.01 a₿ (block 963,692). Wipe and reseed any time: node scripts/bench-seed.mjs — run it twice, the bytes are identical."),
  ]),
];

/* ── page 2 · memberships — tier cards: structured content to poke ─────── */
const mb = kit("bench-memberships");
const membershipsContent = [
  mb.band("plain", "theme", [
    mb.eyebrow("Memberships — a demo shelf", "center"),
    mb.heading("Three Tiers, Side by Side", "h1", "center"),
    mb.text("Tier cards are the studio's favourite patient: panels, lists, buttons and prices, all nested three-across. Each tier below includes everything before it.", "center"),
  ]),
  mb.band("plain", "theme", [
    mb.threecol(
      [mb.panel([
        mb.img("/images/blank/tier-a.webp", "ASSET SLOT — tier art not yet drawn", 300, "soft", "center"),
        mb.heading("Tier A", "h3", "center"),
        mb.text("$10/mo", "center"),
        mb.list([
          "A perk, in the community's own words",
          "Another perk — edit me",
          "A third line, ready to rewrite",
        ]),
        mb.button("Choose Tier A →", "/p/memberships", "gold", "center"),
      ])],
      [mb.panel([
        mb.img("/images/blank/tier-b.webp", "ASSET SLOT — tier art not yet drawn", 300, "soft", "center"),
        mb.heading("Tier B", "h3", "center"),
        mb.text("$25/mo", "center"),
        mb.list([
          "Everything in Tier A",
          "One more perk on top",
          "A third line to restyle",
        ]),
        mb.button("Choose Tier B →", "/p/memberships", "gold", "center"),
      ])],
      [mb.panel([
        mb.img("/images/blank/tier-c.webp", "ASSET SLOT — tier art not yet drawn", 300, "soft", "center"),
        mb.heading("Tier C", "h3", "center"),
        mb.text("$50/mo", "center"),
        mb.list([
          "Everything in Tier A & Tier B",
          "The top tier's own perk",
          "A final line — make it sing",
        ]),
        mb.button("Choose Tier C →", "/p/memberships", "gold", "center"),
      ])],
    ),
    mb.note("Demo tiers — invented prices; the checkout is not wired on the bench. Poke the structure, not the sats."),
    mb.divider(),
    mb.faq([
      { q: "Can I edit these cards?", a: "That is what they are for. Open /studio/memberships, click any panel, and the fields rail lights up — swap the art, rewrite a list, restyle the price line." },
      { q: "Where does this page live?", a: "LIVE at puck:page:memberships under bench-data/ — one JSON file per key, the filesystem driver's whole format. Publish copies your draft over it." },
      { q: "Why gold buttons?", a: "House law: gold is money. A tier button is a money door, so it wears gold; quiet and teal carry everything else." },
    ]),
  ]),
];

/* ── page 3 · field-notes — a content page: two columns, a gallery, a
     video, and the oddments (Card, Quote) ─────────────────────────────── */
const fn = kit("bench-notes");
const fieldNotesContent = [
  fn.band("plain", "theme", [
    fn.eyebrow("Field notes — the content page"),
    fn.heading("Blocks, Side by Side", "h1"),
    fn.rich("This page exists to exercise the layout blocks: a <b>TwoColumns</b> with a panel one side and art the other, a tilted <b>Gallery</b>, an embedded <b>Video</b>, and the oddments below. Nothing here is precious — rearrange it."),
    fn.spacer(12),
    fn.twocol(
      [fn.panel([
        fn.heading("The left column", "h3"),
        fn.text("A glass panel inside a column: the nesting the studio was built for. Drag something in here and the rails spec keeps it honest — full-width blocks stay root-only."),
        fn.list([
          "Panels accept content, not layout",
          "Columns nest inside columns (lint warns)",
          "Bands and heroes never leave the root",
        ]),
      ])],
      [fn.img("/images/blank/column-art.webp", "ASSET SLOT — column art not yet drawn", 360, "round", "center")],
      36,
      "center",
    ),
    fn.divider(),
    fn.heading("The gallery", "h2", "center"),
    fn.gallery([
      { src: "/images/blank/gallery-1.webp", alt: "ASSET SLOT — gallery photograph 1" },
      { src: "/images/blank/gallery-2.webp", alt: "ASSET SLOT — gallery photograph 2" },
      { src: "/images/blank/gallery-3.webp", alt: "ASSET SLOT — gallery photograph 3" },
      { src: "/images/blank/gallery-4.webp", alt: "ASSET SLOT — gallery photograph 4" },
    ], "yes"),
    fn.spacer(24),
    fn.heading("The video", "h2", "center"),
    fn.video("", "16/9"),
    fn.text("The video slot is honestly empty — the Video block takes any YouTube link and frames it, and a template borrows no one's film.", "center", st({ size: 15, spaceAbove: 14 })),
    fn.divider(),
    fn.twocol(
      [fn.card("A card", "The simplest glass in the kit — a title and a body. Duplicate it, stack it, restyle it.")],
      [fn.quote("Move a block. Break the page. Reseed. That is what a bench is for.", "left")],
      26,
      "center",
    ),
    fn.buttons([
      { label: "Back to the welcome mat →", href: "/p/home", variant: "teal" },
    ], "center"),
  ]),
];

/* ── the popup — a real document + a real trigger, so the popups panel has
     something to toggle and PopupHost something to fire on /p/* ────────── */
const pu = kit("bench-popup");
const popupContent = [
  pu.eyebrow("A bench hello", "center"),
  pu.heading("The Popup Works Too", "h2", "center", st()),
  pu.img("/images/blank/popup-art.webp", "ASSET SLOT — popup art not yet drawn", 280, "soft", "center"),
  pu.text("This card is a full Puck document at popup:bench-note — edit it in the studio like any page, and toggle when and where it fires from the popups panel.", "center"),
  pu.button("Read the field notes →", "/p/field-notes", "teal", "center"),
];

const pages = {
  home: { content: homeContent, root: { props: {
    title: "The Studio Bench",
    description: "A local proving ground for the studio: three demo pages and a popup, seeded on the filesystem, no cloud required.",
  } } },
  memberships: { content: membershipsContent, root: { props: {
    title: "Memberships (bench demo)",
    description: "Three tiers side by side — tier cards as structured studio content: panels, lists, buttons and prices to poke.",
  } } },
  "field-notes": { content: fieldNotesContent, root: { props: {
    title: "Field Notes (bench demo)",
    description: "Blocks side by side — two columns, a gallery, a video and the oddments: the layout kit on one demo page.",
  } } },
  "popup:bench-note": { content: popupContent, root: { props: {
    title: "The bench says hello",
  } } },
};

/* The index SET (every known slug, popups included — the API checks
   listPuckPages for popup names), the pages panel's display order, and one
   real popup trigger override (overlaid on the code-side defaults by
   mergedPopupTriggers; pages are site paths, /p/* for built pages). */
const INDEX = ["home", "memberships", "field-notes", "popup:bench-note"];
const ORDER = ["home", "memberships", "field-notes"];
const POPUP_CONFIG = {
  "bench-note": {
    enabled: true,
    delayMs: 2000,
    oncePerSession: true,
    pages: ["/p/home", "/p/memberships", "/p/field-notes"],
  },
};

/* ── write it, the driver's way: one file per key, encodeURIComponent'd ── */
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const written = [];
const writeKey = (key, value) => {
  const file = `${encodeURIComponent(key)}.json`;
  writeFileSync(join(dir, file), value, "utf8");
  written.push(file);
};

for (const [slug, data] of Object.entries(pages)) {
  writeKey(`puck:page:${slug}`, JSON.stringify(data));
}
writeKey("puck:pages", JSON.stringify(INDEX));
writeKey("puck:page-order", JSON.stringify(ORDER));
writeKey("puck:popup-config", JSON.stringify(POPUP_CONFIG));
/* drafts deliberately absent: the studio resolves draft ?? live ?? seed,
   and a fresh bench should open these pages as LIVE work */

console.log(`[bench-seed] rebuilt ${dir} — ${written.length} key files:`);
for (const f of written) console.log(`[bench-seed]   ${f}`);
console.log("[bench-seed] drafts left empty; boot the bench with PUCK_STORE_DRIVER=filesystem PUCK_STORE_FS_DIR=bench-data");
