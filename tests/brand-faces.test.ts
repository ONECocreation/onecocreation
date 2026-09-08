import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-182 (0018.06.18 a₿) — the Brand desk's fonts and colours work, and
 * the dressing room reads by page. Pins:
 *
 *  · colour + font SAVE ROUND-TRIP through the real /api/brand route
 *    against a fixture KV store (a tiny in-test Upstash-REST twin) — the
 *    faces ride brand-palette.ts's own key on the SAME route, one truth;
 *  · a face OUTSIDE the house's shelf is refused in words (400, the reason
 *    names the shelf) and nothing is written;
 *  · the dressing room's per-page grouping DERIVES from the cartridge's
 *    asset map (PAGE_ASSET_MAP → assetsByPage), and derive-or-dash holds:
 *    a slot with no value — or a value whose file the server could not
 *    find — resolves NOT SET.
 *
 * The operator cookie is minted with the real makeOperatorToken (the
 * recon-img idiom); the env is pinned before any module loads.
 */

let cookie: string;
let server: http.Server;
let store: Map<string, string>;

beforeAll(async () => {
  const pk = getPublicKey(generateSecretKey());
  process.env.SEAT_SECRET = "t182-test-seat-secret";
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);

  /* the fixture store — the bare Upstash-REST shape brand-palette.ts's
     kv() speaks: a POSTed command array, { result } back */
  store = new Map();
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const [cmd, key, val] = JSON.parse(body) as [string, string, string?];
      if (cmd === "GET") res.end(JSON.stringify({ result: store.get(key) ?? null }));
      else if (cmd === "SET") { store.set(key, val as string); res.end(JSON.stringify({ result: "OK" })); }
      else res.end(JSON.stringify({ result: null }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  process.env.KV_REST_API_URL = `http://127.0.0.1:${port}`;
  process.env.KV_REST_API_TOKEN = "t182-fixture-token";

  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
});

afterAll(() => new Promise((resolve) => server.close(() => resolve(undefined))));

const call = (body?: unknown) =>
  new Request("http://localhost/api/brand", body === undefined
    ? { headers: { cookie } }
    : { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });

const route = () => import("@/app/api/brand/route");

const PALETTE = { p1: "#112233", p2: "#334455", p3: "#556677", p4: "#778899", p5: "#99aabb" };
const FACES = { display: "roboto", heading: "lucida", body: "system" };

describe("TASK-182 — the brand rail round-trip (fixture store)", () => {
  it("a colour save and a font save both round-trip through the real route", async () => {
    const { GET, POST } = await route();

    const colourSave = await (await POST(call({ palette: PALETTE }))).json();
    expect(colourSave.ok).toBe(true);

    const fontSave = await (await POST(call({ faces: FACES }))).json();
    expect(fontSave.ok).toBe(true);

    const read = await (await GET(call())).json();
    expect(read.ok).toBe(true);
    expect(read.palette).toEqual(PALETTE);
    expect(read.faces).toEqual(FACES);
    /* the shelf rides down to the pickers — the client never hardcodes it */
    expect(read.faceChoices.map((c: { key: string }) => c.key)).toContain("barlow");
  });

  it("a face off the house's shelf is refused in words — and nothing is written", async () => {
    const { GET, POST } = await route();
    const res = await POST(call({ faces: { display: "papyrus", heading: "lucida", body: "system" } }));
    expect(res.status).toBe(400);
    const d = await res.json();
    expect(d.ok).toBe(false);
    expect(d.reason).toContain("papyrus");
    expect(d.reason).toContain("Barlow"); // the refusal names the shelf

    const read = await (await GET(call())).json();
    expect(read.faces).toEqual(FACES); // the earlier save stands, unmoved
  });

  it("reset returns BOTH rails — palette and faces — to the cartridge default", async () => {
    const { POST } = await route();
    const d = await (await POST(call({ reset: true }))).json();
    expect(d.ok).toBe(true);
    expect(d.faces).toEqual({ display: "barlow", heading: "helvetica", body: "helvetica" });
  });
});

describe("TASK-182 — the dressing room reads by page", () => {
  it("the per-page grouping derives from the cartridge's asset map", async () => {
    const { assetsByPage, PAGE_ASSET_MAP } = await import("@/components/style/BrandBoard");

    /* the fixture: one identity value set and on disk, one set but missing
       from disk, everything else empty */
    const identity = { "hero.moon": "/images/moon.webp", "hero.lionsGate": "/images/gate.webp" };
    const files = { "hero.moon": true, "hero.lionsGate": false };
    const pages = assetsByPage(identity, files);

    /* every card of the map, in order, no invention */
    expect(pages.map((p) => p.page)).toEqual(PAGE_ASSET_MAP.map((p) => p.page));
    expect(pages.map((p) => p.page)).toEqual(
      ["Every page", "Home", "About", "Memberships", "Store", "Book", "Classes", "Letters"],
    );

    /* the moon sits on the Book card (and Home's), resolved SET */
    const book = pages.find((p) => p.page === "Book")!;
    const moon = book.slots.find((s) => s.field === "hero.moon")!;
    expect(moon.value).toBe("/images/moon.webp");
    expect(moon.set).toBe(true);
    expect(book.slots.map((s) => s.field)).toContain("portraits.cuts.women");

    /* derive-or-dash: a file the server could not find is NOT SET */
    const memberships = pages.find((p) => p.page === "Memberships")!;
    const lion = memberships.slots.find((s) => s.field === "hero.lionsGate")!;
    expect(lion.value).toBe("/images/gate.webp");
    expect(lion.set).toBe(false);
    expect(lion.fallback.length).toBeGreaterThan(0); // the fallback in words rides along

    /* an empty value is NOT SET too */
    const about = pages.find((p) => p.page === "About")!;
    expect(about.slots.every((s) => !s.set)).toBe(true);

    /* a handed-down map drives the grouping — the page list is never
       hardcoded into the resolver */
    const custom = assetsByPage(identity, files, [
      { page: "Fixture Page", href: "/x", blurb: "a fixture", slots: [
        { field: "hero.moon", label: "the moon", does: "fixture duty", fallback: "nothing shows" },
      ]},
    ]);
    expect(custom).toHaveLength(1);
    expect(custom[0].page).toBe("Fixture Page");
    expect(custom[0].slots[0].set).toBe(true);
  });
});
