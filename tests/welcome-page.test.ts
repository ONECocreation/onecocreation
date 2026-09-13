import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * TASK-212 (0018.06.23 a₿, Love's call #25/#33/#34/#38) — the welcome page.
 * Items 1/6/7 (the three doors, the nostr-key line, first-login routing)
 * were ALREADY LANDED by T-185/T-211 — pinned already by door-machine.test.ts
 * ("ruling 1", the landing-rule describes, the arcade-voice source pin).
 * This file pins what THIS lane actually built:
 *   2. the walking shine — reuses .shine-hover/@keyframes shine-spin
 *      (house.css, unedited), a scoped trigger class fires it off a
 *      JS-cycled state
 *   3. the card border — the doors take `.card` (the exact rule /book's
 *      ServiceCard uses), no bespoke border re-spelled
 *   4. Love's picture slot — an honest empty frame, WELCOME_PHOTO_URL null
 *      until her photo lands
 *   5. the preferred name in the constellation — ConstellationCard's
 *      refreshKey + EmailMemberPanel's wiring, and the real profile route
 *      round-trip (fixture KV, the money-preference.test.ts pattern)
 *   6. (re-verified) the sign-in door renders BOTH paths together, no
 *      jargon wall
 */

const SRC = join(__dirname, "..", "src");
const readSrc = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

describe("item 2 — the walking shine reuses the fleet's own recipe, never rebuilds it", () => {
  const flow = () => readSrc("components", "welcome", "WelcomeFlow.tsx");

  it("the doors carry .card + .shine-hover — the same classes /book's border and the fleet's hover-beam already use", () => {
    expect(flow()).toMatch(/className=\{`card shine-hover/);
  });

  it("no bespoke border/border-radius is re-spelled on the doors (imported from .card, house.css)", () => {
    const src = flow();
    const doorsBlock = src.slice(src.indexOf("DOORS.map"), src.indexOf("</Link>\n            ))"));
    expect(doorsBlock).not.toContain("borderRadius: 16");
    expect(doorsBlock).not.toMatch(/border:\s*"1px solid var\(--glass-edge\)"/);
  });

  it("the trigger rule fires the fleet's own shine-spin keyframe off a class, and never redefines it", () => {
    const src = flow();
    expect(src).toContain("shine-walk");
    expect(src).toContain("animation:shine-spin 2.4s linear infinite");
    expect(src).not.toContain("@keyframes shine-spin"); // reused from house.css, not rebuilt
  });

  it("house.css itself is untouched by this lane (no seam needed — the trigger lives in a scoped <style> in WelcomeFlow)", () => {
    const css = readFileSync(join(SRC, "app", "house.css"), "utf8");
    expect(css).not.toContain("shine-walk");
  });

  it("prefers-reduced-motion holds the shine still — no interval starts, and the class stays lit without motion", () => {
    const src = flow();
    expect(src).toContain("prefers-reduced-motion: reduce");
    expect(src).toMatch(/if \(!session \|\| reducedMotion\) return;/);
    expect(src).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("one door is lit at a time, cycling — never all three or none while signed in", () => {
    const src = flow();
    expect(src).toMatch(/setWalkIdx\(\(i\) => \(i \+ 1\) % DOORS\.length\)/);
  });
});

describe("item 4 — Love's picture slot: an honest empty frame, never a stock face", () => {
  const flow = () => readSrc("components", "welcome", "WelcomeFlow.tsx");

  it("the photo slot is a nullable constant, null until Love's photo lands", () => {
    expect(flow()).toMatch(/const WELCOME_PHOTO_URL: string \| null = null;/);
  });

  it("no stock image URL is wired in — the frame renders a glyph, not a picture, while the slot is empty", () => {
    const src = flow();
    expect(src).not.toMatch(/https?:\/\/.*\.(jpg|jpeg|png|webp)/i);
    expect(src).toContain("Love&apos;s photo is on its way");
  });
});

describe("item 5 — the preferred name in the constellation", () => {
  const constellation = () => readSrc("components", "me", "ConstellationCard.tsx");
  const panel = () => readSrc("components", "me", "EmailMemberPanel.tsx");

  it("ConstellationCard takes an optional refreshKey — omitted callers still mount once (MeSwitch.tsx unaffected)", () => {
    const src = constellation();
    expect(src).toMatch(/refreshKey\s*\}:\s*\{\s*refreshKey\?:\s*number\s*\}\s*=\s*\{\}/);
    expect(src).toMatch(/\},\s*\[refreshKey\]\);/);
  });

  it("MeSwitch's bare call still mounts ConstellationCard with no prop (unchanged behaviour for key members)", () => {
    const src = readSrc("components", "me", "MeSwitch.tsx");
    expect(src).toMatch(/<ConstellationCard \/>/);
  });

  it("EmailMemberPanel bumps a version counter on a successful save and passes it as refreshKey — the name lights the star the same moment, no reload", () => {
    const src = panel();
    expect(src).toMatch(/const \[profileVersion, setProfileVersion\] = useState\(0\);/);
    expect(src).toMatch(/setProfileVersion\(\(v\) => v \+ 1\)/);
    expect(src).toContain("<ConstellationCard refreshKey={profileVersion} />");
  });

  it("the field's words say plainly that this is the name the constellation shows", () => {
    expect(panel()).toContain("this is\n          the name your constellation shows");
  });
});

describe("item 5 (gate) — the profile route round-trip: a preferred name persists", () => {
  const KV_URL = "http://kv.fixture.welcome-page";
  const kvStore = new Map<string, string>();

  beforeAll(() => {
    process.env.KV_REST_API_URL = KV_URL;
    process.env.KV_REST_API_TOKEN = "fixture-kv-token";
    process.env.SEAT_SECRET = "test-seat-secret-212";
    vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
      const u = String(url);
      if (u === KV_URL) {
        const cmd = JSON.parse(String(init?.body)) as unknown[];
        const [op, key] = cmd.map(String);
        let result: unknown = null;
        if (op === "GET") result = kvStore.get(key) ?? null;
        else if (op === "SET") { kvStore.set(key, cmd[2] as string); result = "OK"; }
        return new Response(JSON.stringify({ result }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${u}`);
    });
  });

  it("a visitor picks a name, PUTs it, and the very next GET reads it back — the constellation's own source of truth", async () => {
    kvStore.delete("member:profile:starling@example.com");
    const { makeFrenToken } = await import("@/lib/fren-auth");
    const { GET, PUT } = await import("@/app/api/member/profile/route");
    const cookie = `pa-fren=${makeFrenToken("starling@example.com", "email")}`;
    const req = (method: string, body?: unknown) =>
      new Request("http://localhost/api/member/profile", {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), Cookie: cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

    const before = await (await GET(req("GET"))).json();
    expect(before.displayName).toBe("");

    const put = await PUT(req("PUT", { displayName: "Starling" }));
    expect(put.status).toBe(200);
    expect((await put.json()).displayName).toBe("Starling");

    const after = await (await GET(req("GET"))).json();
    expect(after.displayName).toBe("Starling");
  });
});

describe("item 6 (re-verified, not rebuilt) — the sign-in door renders both paths together", () => {
  it("the email form and the key note/CTA render in the same sign-in block, unconditionally, no jargon wall", () => {
    const src = readFileSync(join(SRC, "components", "door", "DoorSheet.tsx"), "utf8");
    const start = src.indexOf('state === "sign-in" &&');
    const end = src.indexOf('state === "code" &&');
    const signInBlock = src.slice(start, end);
    expect(signInBlock).toContain('type="email"');
    expect(signInBlock).toContain("{DOOR_KEY_NOTE}");
    expect(signInBlock).toContain("{DOOR_KEY_CTA}");
  });

  it("the key note names the key gently — no bare 'nostr' jargon dropped on a newcomer", async () => {
    const { DOOR_KEY_NOTE } = await import("@/components/door/door-machine");
    expect(DOOR_KEY_NOTE.toLowerCase()).not.toContain("nostr");
    expect(DOOR_KEY_NOTE.toLowerCase()).toContain("key");
  });
});
