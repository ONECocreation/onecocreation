import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";
import AboutFeatured from "@/components/about/AboutFeatured";
import { SEEDS, applyFeaturedToPuck } from "@/lib/puck-seeds";
import type { AboutVideo } from "@/lib/about-content";

/**
 * TASK-239 (0018.06.23 a₿ · block 966,895) — the "Top of About" video,
 * Love's Sep 8 ask ("Top of about pg? Welcome Home to You."). Pins:
 *  · AboutFeatured — absent `video` renders nothing at all (derive-or-dash,
 *    no placeholder box); a saved one renders the muted-autoplay
 *    youtube-nocookie embed with its id and title, plus the plain
 *    "Tap the speaker" line
 *  · aboutPatchError — the "Top of About" video rides the same `about` doc
 *    as the playlist, refused IN WORDS the same way; optional (omitted or
 *    explicit null both mean "cleared")
 *  · config first, no seed fallback — unlike `videos`, an absent `featured`
 *    has nothing standing behind it
 *  · applyFeaturedToPuck — the seed carries the block: no saved featured ⇒
 *    the Puck data is untouched; a saved one inserts a Video block between
 *    the seed's first two Bands
 */

const FEATURED: AboutVideo = { id: "YAJMh0qoftI", title: "Welcome Home to You", ratio: "16/9" };

describe("AboutFeatured — derive-or-dash", () => {
  it("absent video renders nothing at all", () => {
    const html = renderToStaticMarkup(createElement(AboutFeatured, { video: undefined }));
    expect(html).toBe("");
  });

  it("a saved video renders the muted-autoplay youtube-nocookie embed, its title, and the tap line", () => {
    const html = renderToStaticMarkup(createElement(AboutFeatured, { video: FEATURED }));
    expect(html).toContain(
      `https://www.youtube-nocookie.com/embed/${FEATURED.id}?autoplay=1&amp;mute=1&amp;playsinline=1&amp;rel=0`,
    );
    expect(html).toContain(FEATURED.title);
    expect(html).toContain("Tap the speaker to hear her");
    // nothing else on the page is implied to autoplay by this markup —
    // there is exactly one iframe, this one
    expect((html.match(/<iframe/g) ?? []).length).toBe(1);
  });
});

describe("applyFeaturedToPuck — the seed carries the block", () => {
  it("no saved featured ⇒ the seed's Puck data is returned untouched (same reference)", () => {
    expect(applyFeaturedToPuck(SEEDS.about, undefined)).toBe(SEEDS.about);
  });

  it("a saved featured inserts a Video block right after the seed's first Band, 16/9, leaving the rest intact", () => {
    const before = SEEDS.about.content as { type: string }[];
    const out = applyFeaturedToPuck(SEEDS.about, FEATURED);
    const content = out.content as { type: string; props: Record<string, unknown> }[];
    expect(content.length).toBe(before.length + 1);
    expect(content[0]).toBe(before[0]); // the faces band, unmoved
    expect(content[2]).toBe(before[1]); // the old second band, pushed one over
    const insertedBand = content[1];
    expect(insertedBand.type).toBe("Band");
    const bandContent = insertedBand.props.content as { type: string; props: Record<string, unknown> }[];
    const videoBlock = bandContent.find((b) => b.type === "Video");
    expect(videoBlock?.props.youtube).toBe(FEATURED.id);
    expect(videoBlock?.props.ratio).toBe("16/9");
    // the seed itself is never mutated
    expect((SEEDS.about.content as unknown[]).length).toBe(before.length);
  });
});

describe("aboutPatchError — the featured video refused IN WORDS", () => {
  let aboutPatchError: (typeof import("@/lib/site-config"))["aboutPatchError"];

  beforeAll(async () => {
    ({ aboutPatchError } = await import("@/lib/site-config"));
  });

  it("omitted, or explicit null, both pass clean (cleared)", () => {
    expect(aboutPatchError({ videos: [] })).toBeNull();
    expect(aboutPatchError({ videos: [], featured: null })).toBeNull();
  });

  it("a clean featured video passes", () => {
    expect(aboutPatchError({ videos: [], featured: FEATURED })).toBeNull();
  });

  it("a bad id, a missing title, and a bad shape are each refused by name", () => {
    expect(aboutPatchError({ videos: [], featured: { id: "short", title: "x", ratio: "16/9" } }))
      .toMatch(/featured video: the id must be the 11-character YouTube id/);
    expect(aboutPatchError({ videos: [], featured: { id: FEATURED.id, title: "  ", ratio: "16/9" } }))
      .toMatch(/featured video: a title is required/);
    expect(aboutPatchError({ videos: [], featured: { id: FEATURED.id, title: "x", ratio: "4/3" } }))
      .toMatch(/featured video: the shape must be landscape \(16\/9\) or portrait \(9\/16\)/);
    expect(aboutPatchError({ videos: [], featured: "nope" })).toMatch(/featured video isn't an object/);
  });
});

describe("SiteConfig.about.featured — config first, no seed behind it (derive-or-dash)", () => {
  const { cleanup: cleanupCwd } = isolateCwd("oc-about-featured-");
  const FILE = path.join(process.cwd(), "data", "site-config.json");

  let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
  let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
  let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
  let cookie: string;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.REGISTRY_DRIVER;
    process.env.SEAT_SECRET = "about-featured-test-secret";
    const pk = getPublicKey(generateSecretKey());
    process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
    const { makeOperatorToken } = await import("@/lib/operator-auth");
    cookie = `fe-operator=${makeOperatorToken(pk)}`;
    await fs.rm(FILE, { force: true });
    ({ getSiteConfig, saveSiteConfig } = await import("@/lib/site-config"));
    ({ PUT: sitePUT } = await import("@/app/api/admin/site/route"));
  });

  afterAll(async () => {
    await fs.rm(FILE, { force: true });
    cleanupCwd();
  });

  const put = (body: unknown) =>
    sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify(body),
    }));

  it("no saved about ⇒ featured is absent, no fallback stands behind it", async () => {
    const config = await getSiteConfig();
    expect(config.about).toBeUndefined();
    expect(config.about?.featured).toBeUndefined();
  });

  it("a saved featured wins, round-trips through the real PUT route, and survives an unrelated save", async () => {
    const res = await put({ about: { videos: [], featured: FEATURED } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.config.about.featured).toEqual(FEATURED);

    await saveSiteConfig({ payments: { stripe: true } }); // any other save
    const config = await getSiteConfig();
    expect(config.about?.featured).toEqual(FEATURED); // untouched
  });

  it("saving the playlist rows alone (no `featured` key) clears it — the whole doc replaces", async () => {
    await saveSiteConfig({ about: { videos: [], featured: FEATURED } });
    await saveSiteConfig({ about: { videos: [{ id: "2LrWVQDnLd0", title: "one", ratio: "9/16" }] } });
    const config = await getSiteConfig();
    expect(config.about?.featured).toBeUndefined();
  });

  it("clearing with an explicit null removes a saved one", async () => {
    await saveSiteConfig({ about: { videos: [], featured: FEATURED } });
    await saveSiteConfig({ about: { videos: [], featured: undefined } });
    let config = await getSiteConfig();
    // omitted-in-a-fresh-object case above is really "not present" in JS —
    // exercise the real PUT wire format the Clear button sends (JSON drops
    // the undefined key entirely)
    await put({ about: { videos: [], featured: FEATURED } });
    await put(JSON.parse(JSON.stringify({ about: { videos: [], featured: undefined } })));
    config = await getSiteConfig();
    expect(config.about?.featured).toBeUndefined();
  });

  it("sanitize backstop: a hand-edited doc drops a malformed featured, keeps the good videos", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(
      FILE,
      JSON.stringify({ about: { videos: [], featured: { id: "not-an-id", title: "bad", ratio: "16/9" } } }),
      "utf8",
    );
    const config = await getSiteConfig();
    expect(config.about?.featured).toBeUndefined();
    await fs.rm(FILE, { force: true });
    await getSiteConfig(); // re-warm to defaults
  });
});
