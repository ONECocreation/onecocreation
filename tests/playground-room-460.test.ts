import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { ROOMS } from "@/lib/matrix-rooms";
import { TIERS } from "@/lib/entitlement";
import type { Stage2DoorBodyProps } from "@/components/rooms/Stage2Door";

/**
 * TASK-460 (block 968,543 — decision cw-playground-where, option B): the
 * Weekly Intuitive room becomes THE PLAYGROUND, and its own room gets a
 * plain "Join the Playground call" door (never wired into the room's OWN
 * stage/embed — that was option C, not ruled). Pins for every Build item:
 *  1. ROOMS' own title (matrix-rooms.ts:19) — id/slug/kind/minTier
 *     unchanged.
 *  2. puck-seeds.ts's seed line (re-trued alongside package-names.test.ts's
 *     own pin at :78 — the two suites cover the same literal on purpose).
 *  3. PlaygroundDoor.tsx (new leaf, the operator-census seam T-450 already
 *     proved — see StoryTimePill.tsx's own docblock) renders ONLY in
 *     `clair-senses`, never in the Heart Field or any other room.
 *  4. Stage2Door.tsx carries no member-facing "Stage 2" words anywhere;
 *     Love's own Stage2Card keeps its words (untouched, not pinned here).
 *  5. admin/stage2/route.ts's SEC-4 wrap (mirrors admin/stage1's own,
 *     tests/admin-stage1-route.test.ts's harness) and Stage2Card.tsx's
 *     defensive response read (a repo with no jsdom pins this as a SOURCE
 *     pin, the house's own idiom for an un-renderable client closure —
 *     tests/stage2-door.test.ts's "source pins" describe, this suite's
 *     sibling).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

// ---------------------------------------------------------------------------
// 1 — ROOMS' own title
// ---------------------------------------------------------------------------

describe("matrix-rooms.ts — the Weekly Intuitive room's title (Build 1)", () => {
  it('the clair-senses room reads "The Playground" — id, slug, kind and minTier untouched', () => {
    const room = ROOMS.find((r) => r.id === "#clair-senses:onecocreation.com");
    expect(room, "clair-senses room missing from ROOMS").toBeDefined();
    expect(room!.title).toBe("The Playground");
    expect(room!.kind).toBe("class");
    expect(room!.minTier).toBe("A");
  });

  it('no room anywhere still reads "Clair Senses — Foundations"', () => {
    expect(ROOMS.some((r) => r.title === "Clair Senses — Foundations")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2 — puck-seeds.ts's seed line
// ---------------------------------------------------------------------------

describe("puck-seeds.ts — the Classes column names The Playground (Build 2)", () => {
  it('the seed line reads "✦ The Playground · Weekly Intuitive"', async () => {
    const src = await read("src/lib/puck-seeds.ts");
    expect(src).toContain(`✦ The Playground · ${TIERS.A.name}`);
    expect(src).not.toContain("Clair Senses — Foundations");
  });
});

// ---------------------------------------------------------------------------
// 3 — PlaygroundDoor.tsx + its mount, ONLY in clair-senses
// ---------------------------------------------------------------------------

describe("PlaygroundDoor.tsx — the Weekly Intuitive room's own door (Build 3)", () => {
  it("renders the join link and the quiet line, on the kit's main button, no legacy classes or inline style", async () => {
    const PlaygroundDoor = (await import("@/components/rooms/PlaygroundDoor")).default;
    const html = renderToStaticMarkup(h(PlaygroundDoor));
    expect(html).toContain('href="/reading/playground"');
    expect(html).toContain("Join the Playground call");
    expect(html).toContain("Love opens the call after the reading.");
    expect(html).toContain("Weekly Intuitive members and up.");
    expect(html).toContain("kit-btn kit-btn-main kit-btn-sm");
    expect(html).toContain("kit-text-quiet");
    expect(html).not.toContain('class="btn');
    expect(html).not.toContain("btn-gold");
    expect(html).not.toContain("style=");
  });

  it("the door's button is the small kit button, like its Stage2Door sibling in the same grid area (review fix: kit-btn-main alone is nowrap at 1.5rem and clips at 390 px)", async () => {
    const src = await read("src/components/rooms/PlaygroundDoor.tsx");
    expect(src).toContain('className="kit-btn kit-btn-main kit-btn-sm"');
  });

  it("StageView's reset control pairs with Stage2Door's 'Join the Playground' — it says the Playground too, never Stage 2", async () => {
    const src = await read("src/components/rooms/StageView.tsx");
    expect(src).toContain("Leave the Playground · back to the reading");
    expect(src).not.toContain("Leave Stage 2 · back to the reading");
  });

  it("StageView guards the door behind the named PLAYGROUND_ROOM_SLUG constant — never a second bare 'clair-senses' string", async () => {
    const src = await read("src/components/rooms/StageView.tsx");
    expect(src).toContain('import { READING_ROOM_SLUG, PLAYGROUND_ROOM_SLUG } from "@/lib/reading-room";');
    expect(src).toContain("slug === PLAYGROUND_ROOM_SLUG");
    expect(src).not.toContain('"clair-senses"');
  });

  it('PLAYGROUND_ROOM_SLUG is "clair-senses", defined beside READING_ROOM_SLUG', async () => {
    const { PLAYGROUND_ROOM_SLUG, READING_ROOM_SLUG } = await import("@/lib/reading-room");
    expect(PLAYGROUND_ROOM_SLUG).toBe("clair-senses");
    expect(READING_ROOM_SLUG).not.toBe(PLAYGROUND_ROOM_SLUG);
    const src = await read("src/lib/reading-room.ts");
    expect(src.indexOf("READING_ROOM_SLUG")).toBeLessThan(src.indexOf("PLAYGROUND_ROOM_SLUG"));
  });
});

describe("StageView — the door renders ONLY for clair-senses (Build 3)", () => {
  const BASE = { live: false, roster: null } as const;
  const CLAIR = { slug: "clair-senses", alias: "#clair-senses:onecocreation.com", title: "The Playground", kind: "class" as const, ...BASE };
  const HEART_FIELD = { slug: "heart-field", alias: "#heart-field:onecocreation.com", title: "The Heart Field", kind: "community" as const, ...BASE };
  const OTHER = { slug: "evening-star", alias: "#inner-sanctum:onecocreation.com", title: "Evening Star — Inner Sanctum", kind: "community" as const, ...BASE };

  it("clair-senses renders the join link and the quiet line", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(h(StageView, CLAIR));
    expect(html).toContain('href="/reading/playground"');
    expect(html).toContain("Join the Playground call");
  });

  it("the Heart Field renders unchanged — no Playground join link, its own Stage 2 door area untouched", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(h(StageView, HEART_FIELD));
    expect(html).not.toContain('href="/reading/playground"');
    expect(html).not.toContain("Join the Playground call");
    /* the reading room's OWN stage2 wrapper still stands (Stage2Door lives here) */
    expect(html).toContain("cl-area-stage2");
  });

  it("no other room renders the door, or any stage2-area wrapper at all", async () => {
    const StageView = (await import("@/components/rooms/StageView")).default;
    const html = renderToStaticMarkup(h(StageView, OTHER));
    expect(html).not.toContain('href="/reading/playground"');
    expect(html).not.toContain("Join the Playground call");
    expect(html).not.toContain("cl-area-stage2");
  });
});

// ---------------------------------------------------------------------------
// 4 — Stage2Door.tsx carries no member-facing "Stage 2" anywhere
// ---------------------------------------------------------------------------

async function renderStage2Body(props: Partial<Stage2DoorBodyProps>) {
  const { Stage2DoorBody } = await import("@/components/rooms/Stage2Door");
  return renderToStaticMarkup(
    h(Stage2DoorBody, {
      decision: "hidden",
      reachable: null,
      pkg: null,
      joining: false,
      weekBusy: false,
      note: null,
      onJoinClick: () => {},
      onTryWeek: () => {},
      ...props,
    }),
  );
}

describe('Stage2Door.tsx — no rendered state carries the words "Stage 2" (Build 4, T-451\'s own law extended here)', () => {
  const PKG = { name: "Weekly Intuitive", href: "/packages/weekly-intuitive" };
  const WEEK = { itemId: "weekly-one-week", price: "$11" };

  it("every decision, every branch", async () => {
    const states: Array<Partial<Stage2DoorBodyProps>> = [
      { decision: "signin" },
      { decision: "package", pkg: { ...PKG, week: null } },
      { decision: "package", pkg: { ...PKG, week: WEEK } },
      { decision: "open", reachable: true },
      { decision: "open", reachable: true, joining: true },
      { decision: "open", reachable: false },
      { decision: "open", reachable: true, note: "The Playground couldn't be reached just now — try again." },
    ];
    for (const props of states) {
      const html = await renderStage2Body(props);
      expect(html, JSON.stringify(props)).not.toContain("Stage 2");
    }
  });

  it('the region\'s aria-label reads "The Playground"', async () => {
    const html = await renderStage2Body({ decision: "signin" });
    expect(html).toContain('aria-label="The Playground"');
  });

  it("the sign-in line composes off signInDoorLine(\"The Playground\") — pure text, never a second literal", async () => {
    const { signInDoorLine } = await import("@/lib/room-access");
    const html = await renderStage2Body({ decision: "signin" });
    expect(html).toContain(signInDoorLine("The Playground"));
  });

  it("the source itself carries no member-facing Stage 2 string (belt + suspenders on the render pins above)", async () => {
    const src = await read("src/components/rooms/Stage2Door.tsx");
    /* the one surviving mention is a code COMMENT (Amendment 2's own
       docblock, block 968,230) — never inside a JSX text node or a
       template literal the component renders */
    const matches = [...src.matchAll(/Stage 2/g)];
    expect(matches.length).toBe(1);
    const idx = matches[0].index!;
    const lineStart = src.lastIndexOf("\n", idx);
    const line = src.slice(lineStart, src.indexOf("\n", idx));
    expect(line.trim().startsWith("{/*") || line.trim().startsWith("*") || line.trim().startsWith("/*")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5a — admin/stage2/route.ts's SEC-4 wrap
// ---------------------------------------------------------------------------

describe("admin/stage2/route.ts — SEC-4, mirrors admin/stage1/route.ts's own wrap (Build 5)", () => {
  const realFetch = global.fetch;
  let operatorCookie: string;

  beforeAll(async () => {
    process.env.SEAT_SECRET = "task-460-route-test-secret";
    const pk = getPublicKey(generateSecretKey());
    process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
    const { makeOperatorToken } = await import("@/lib/operator-auth");
    operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  async function adminPut(action: string) {
    const { PUT } = await import("@/app/api/admin/stage2/route");
    return PUT(
      new Request("http://test.local/api/admin/stage2", {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: operatorCookie },
        body: JSON.stringify({ action }),
      }),
    );
  }

  it("prepare, publish and close all answer 500 { ok:false, reason } with Cache-Control: no-store when the vault is unreachable", async () => {
    process.env.KV_REST_API_URL = "https://kv.test.local/exec";
    process.env.KV_REST_API_TOKEN = "test-token";
    global.fetch = (async () => {
      throw new Error("vault unreachable");
    }) as unknown as typeof fetch;

    for (const action of ["prepare", "publish", "close"]) {
      const res = await adminPut(action);
      expect(res.status, action).toBe(500);
      expect(res.headers.get("Cache-Control"), action).toBe("no-store");
      expect(await res.json(), action).toEqual({ ok: false, reason: "the stage store didn't answer — nothing changed" });
    }
  });

  it("the route source wraps prepare/publish/close in a try/catch, the same shape as admin/stage1/route.ts", async () => {
    const [stage2Src, stage1Src] = await Promise.all([
      read("src/app/api/admin/stage2/route.ts"),
      read("src/app/api/admin/stage1/route.ts"),
    ]);
    expect(stage2Src).toContain('reason: "the stage store didn\'t answer — nothing changed"');
    expect(stage1Src).toContain('reason: "the stage store didn\'t answer — nothing changed"');
    const tryBlock = stage2Src.match(/try \{\s*\n\s*if \(action === "prepare"\)[\s\S]*?\n\s*\}\s*catch \{/);
    expect(tryBlock, "the prepare/publish/close try block is missing").not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5b — Stage2Card.tsx's defensive response read (no jsdom: a source pin)
// ---------------------------------------------------------------------------

describe("Stage2Card.tsx — a non-JSON PUT response never throws past act() (Build 5, source pin)", () => {
  it("act()'s response read is defensive (.json().catch(...) + optional chaining), never a bare await res.json()", async () => {
    const src = await read("src/app/a/site/reading/Stage2Card.tsx");
    const fn = src.match(/async function act\([\s\S]*?\n {2}\}/);
    expect(fn, "act() not found").not.toBeNull();
    const body = fn![0];
    expect(body).toMatch(/res\.json\(\)\.catch\(/);
    expect(body).toMatch(/data\?\.\ok/);
    expect(body).not.toMatch(/const data = await res\.json\(\);/);
  });

  it("the mount-effect read is untouched — still the pre-existing derive-or-null shape", async () => {
    const src = await read("src/app/a/site/reading/Stage2Card.tsx");
    expect(src).toContain('.then((r) => (r.ok ? r.json() : null))');
  });
});
