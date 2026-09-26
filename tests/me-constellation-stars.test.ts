import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-358 (the Admiral, block 967,926) — the /me constellation: real
 * stars, not decoration. Pins:
 *
 *  A. ConstellationCard.tsx — the two dead stars are gone ("open the
 *     school portal" dropped, "connect a zap wallet" hidden), "hold your
 *     own key" never lands on /login again, and "dress your profile
 *     card" lights from the real useNostrProfile signal.
 *  B. WelcomeFlow.tsx — the community-name claim form (Named decision 2)
 *     is wired to the exact PUT the doors already use, kit components
 *     only, gated to an email member with no accountName yet.
 *  C. /me/your-key — the explainer's words, verbatim from the brief's D6.
 *  D. scripts/account-name-dupe-sweep.mjs — read-only by construction
 *     (SCAN + GET only, never SET/DEL).
 *  E. profile/route.ts — D5's real uniqueness claim: the 409 path, the
 *     atomic SET…NX reservation, the key-handle refusal, and the
 *     value-guarded release on a rename. This repo's vitest runs
 *     `environment: "node"` with no jsdom (Ground, welcome-page.test.ts's
 *     own note) — group E exercises the real route handlers, same as
 *     welcome-page.test.ts's own "item 5 (gate)" describe.
 *
 * Builder caveat honored: the KV mock here is NX- and DEL-capable (unlike
 * welcome-page.test.ts's/money-preference.test.ts's GET/SET-only mock,
 * which never has to touch this — neither test's PUTs carry accountName).
 * The registry file-fallback reads `process.cwd()/data/<space>-registry
 * .json` (registry.ts) — isolateCwd (TASK-158's helper, already proven in
 * catalog-lock.test.ts) chdir's this file into its own temp dir so group
 * E's key-handle fixture is deliberate and never touches the repo's own
 * (nonexistent) data/ directory.
 */

const ROOT = path.join(__dirname, "..");
const readSrc = (...p: string[]) => readFileSync(path.join(ROOT, "src", ...p), "utf8");
const readScript = (...p: string[]) => readFileSync(path.join(ROOT, "scripts", ...p), "utf8");

describe("A — ConstellationCard.tsx: the two dead stars are gone", () => {
  const constellation = () => readSrc("components", "me", "ConstellationCard.tsx");

  it('drops "open the school portal" entirely — arcade residue, Love gives no classes', () => {
    const src = constellation();
    expect(src).not.toContain("school portal");
    expect(src).not.toContain("/classes");
  });

  it('hides "connect a zap wallet" entirely — no NWC code exists anywhere in this repo', () => {
    expect(constellation()).not.toContain("zap wallet");
  });

  it("the sky map shrinks to the four remaining stars (SKY and EDGES stay index-safe)", () => {
    const src = constellation();
    expect(src).toMatch(/const SKY: \[number, number\]\[\] = \[\[[^\]]+\], \[[^\]]+\], \[[^\]]+\], \[[^\]]+\]\];/);
    expect(src).toMatch(/const EDGES: \[number, number\]\[\] = \[\[0, 1\], \[1, 2\], \[2, 3\]\];/);
  });
});

describe('A — ConstellationCard.tsx: "hold your own key" never lands on /login again', () => {
  const constellation = () => readSrc("components", "me", "ConstellationCard.tsx");

  it('the star\'s href is "/me/your-key" — /login never appears as any star\'s href', () => {
    const src = constellation();
    expect(src).toContain('t: "hold your own key"');
    expect(src).toContain('href: "/me/your-key"');
    expect(src).not.toMatch(/href:\s*"\/login"/);
  });

  it('the star stays present-and-unlit for email members (done: !emailMember, block 967,919\'s ruling)', () => {
    expect(constellation()).toMatch(/done: !emailMember,\s*icon: "🔑"/);
  });
});

describe('A — ConstellationCard.tsx: "dress your profile card" lights from the real signal', () => {
  const constellation = () => readSrc("components", "me", "ConstellationCard.tsx");

  it("imports and calls useNostrProfile, reading npub off its own session fetch (Named decision 1(a))", () => {
    const src = constellation();
    expect(src).toContain('import useNostrProfile from "@/hooks/useNostrProfile"');
    expect(src).toMatch(/useNostrProfile\(data\?\.ses\?\.npub\s*\?\?\s*null\)/);
  });

  it('the key branch\'s done reads profileSignal === "found" — no more hardcoded false', () => {
    const src = constellation();
    expect(src).toContain('done: profileSignal === "found"');
    expect(src).not.toMatch(/done:\s*false,\s*icon:\s*"🌸"/);
  });

  it("MeSwitch.tsx's bare mount is untouched (Named decision 1(a) — the welcome-page.test.ts pin never moves)", () => {
    const meSwitch = readSrc("components", "me", "MeSwitch.tsx");
    expect(meSwitch).toMatch(/<ConstellationCard \/>/);
  });

  it("every remaining star's done traces to a fetched or derived value — only \"joined the field\" is the named literal exception", () => {
    // The lane's own "what here is lintable" ADOPT item, re-cast: the
    // refactor from a single setStars([...]) call to a data+derived
    // `stars` (needed so the profile-card star updates once
    // useNostrProfile resolves, instead of freezing at whatever it read
    // the instant the three fetches settled) means the literal anchor
    // `setStars([` no longer exists — the INTENT still holds, checked
    // directly: no bare `done: false,`/`done: true,` besides the one
    // named exception.
    const src = constellation();
    const literalDoneFalse = src.match(/done:\s*false,/g) ?? [];
    const literalDoneTrue = src.match(/done:\s*true,/g) ?? [];
    expect(literalDoneFalse).toEqual([]);
    expect(literalDoneTrue).toEqual(['done: true,']); // "joined the field" only
  });
});

describe("B — WelcomeFlow.tsx: the community-name claim form (Named decision 2)", () => {
  const flow = () => readSrc("components", "welcome", "WelcomeFlow.tsx");

  it("reuses the EXACT PUT call DoorSheet.tsx/SignInCard.tsx already make", () => {
    const src = flow();
    expect(src).toContain('fetch("/api/member/profile"');
    expect(src).toMatch(/method:\s*"PUT"/);
    expect(src).toContain("JSON.stringify({ accountName: want, displayName: want })");
  });

  it("kit components only — Field + Button, submit type flows through Button's {...rest} spread", () => {
    const src = flow();
    expect(src).toContain('import Field from "@/components/kit/Field"');
    expect(src).toContain('import Button from "@/components/kit/Button"');
    expect(src).toMatch(/<Button type="submit"/);
  });

  it('gated to an email member with no accountName yet — never renders for key members or an already-named member', () => {
    const src = flow();
    expect(src).toMatch(/session\.space === "email" && accountName === ""/);
  });

  it("a 409's reason renders inline through the same error slot the kit Field already carries", () => {
    const src = flow();
    expect(src).toContain("setClaimError(data?.reason ??");
    expect(src).toMatch(/error=\{claimError\s*\?\?\s*undefined\}/);
  });
});

describe("C — /me/your-key: the explainer's words, verbatim (D6)", () => {
  const page = () => readSrc("app", "me", "your-key", "page.tsx");

  it('the heading is exactly "What\'s a key?"', () => {
    expect(page()).toContain("What&apos;s a key?");
  });

  it("the three body paragraphs are the Admiral's own words, unedited", () => {
    const src = page();
    expect(src).toContain(
      "A key is a name nobody else can ever take from you — not us, not anyone. Most",
    );
    expect(src).toContain("people keep theirs in a small add-on for their browser, like nos2x, instead of");
    expect(src).toContain("You don&apos;t need one to be here. Your email seat works exactly as it does today.");
    expect(src).toContain("Linking your own key to this email seat is coming — not yet, but it&apos;s on its way.");
  });

  it("no serif font is set, no civil date appears, no product is pushed beyond nos2x", () => {
    const src = page();
    // checks the actual style declarations, not this file's own prose —
    // its docblock says the words "no serif fonts" on purpose
    expect(src).not.toMatch(/fontFamily:\s*["'`][^"'`]*(serif|Georgia)/i);
    expect(src).not.toMatch(/\b(19|20)\d{2}-\d{2}-\d{2}\b/); // no civil (Gregorian) date
    expect(src).not.toMatch(/Alby|amber|damus/i); // named ONE example (nos2x) only
  });

  it("fetches nothing — static, member-facing prose (the Data path's own claim)", () => {
    expect(page()).not.toContain("fetch(");
  });
});

describe("D — account-name-dupe-sweep.mjs: read-only, by construction", () => {
  const src = () => readScript("account-name-dupe-sweep.mjs");

  it("default mode (no --backfill) issues SCAN and GET only — every SET in the file sits behind the backfill gate", () => {
    const s = src();
    expect(s).toMatch(/kv\(\["SCAN"/);
    expect(s).toMatch(/kv\(\["GET"/);
    const backfillGateIdx = s.indexOf("if (!backfill) return;");
    expect(backfillGateIdx).toBeGreaterThan(-1);
    const firstSetIdx = s.indexOf('kv(["SET"');
    // SET exists in the file (the backfill reservation), but only AFTER the
    // early-return that makes default mode never reach it
    expect(firstSetIdx).toBeGreaterThan(backfillGateIdx);
  });

  it("every SET this script can ever emit carries the NX flag — no bare SET, anywhere, in either mode", () => {
    const s = src();
    const setCalls = s.match(/kv\(\[\s*"SET"[^\]]*\]\)/g) ?? [];
    expect(setCalls.length).toBeGreaterThan(0); // the backfill reservation exists
    for (const call of setCalls) expect(call).toContain('"NX"');
  });

  it("never issues DEL, in either mode", () => {
    expect(src()).not.toMatch(/kv\(\["DEL"/);
  });

  it('a DUPLICATED name is skipped under --backfill, never reserved for either twin', () => {
    const s = src();
    expect(s).toMatch(/if \(emails\.length > 1\)/);
    expect(s).toContain('SKIP "${name}"');
  });

  it("refuses to run without KV_REST_API_URL/TOKEN rather than guessing", () => {
    expect(src()).toContain("KV_REST_API_URL and KV_REST_API_TOKEN are required");
  });

  it("--backfill is parsed from argv, off by default", () => {
    const s = src();
    expect(s).toContain('process.argv.includes("--backfill")');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// E — profile/route.ts: D5's real uniqueness claim
// ─────────────────────────────────────────────────────────────────────────

const iso = isolateCwd("oc-task358-");
const KV_URL = "http://kv.fixture.task-358";

function makeFakeKv() {
  const store = new Map<string, string>();
  const fetchStub = (async (url: unknown, init?: { body?: unknown }) => {
    if (String(url) !== KV_URL) throw new Error(`unexpected fetch: ${url}`);
    const cmd = JSON.parse(String(init?.body)) as unknown[];
    const [op, key, val, flag] = cmd.map((x) => (x == null ? x : String(x)));
    let result: unknown = null;
    if (op === "GET") result = store.has(key as string) ? store.get(key as string) : null;
    else if (op === "SET") {
      if (flag === "NX" && store.has(key as string)) result = null;
      else {
        store.set(key as string, val as string);
        result = "OK";
      }
    } else if (op === "DEL") {
      store.delete(key as string);
      result = 1;
    } else {
      throw new Error(`fake kv: unhandled op ${op}`);
    }
    return new Response(JSON.stringify({ result }), { status: 200 });
  }) as unknown as typeof fetch;
  return { store, fetchStub };
}

/** The deliberate registry fixture (Builder caveat): registry.ts's file
 *  fallback reads process.cwd()/data/<space>-registry.json — under
 *  isolateCwd, that's this file's own temp dir, never the repo's. */
function writeKeyRegistry(entries: { handle: string; npub: string }[]) {
  const dataDir = path.join(iso.dir, "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    path.join(dataDir, "onecocreation-registry.json"),
    JSON.stringify({
      space: "onecocreation",
      entries: entries.map((e) => ({
        handle: e.handle,
        npub: e.npub,
        status: "committed" as const,
        batchId: null,
        requestedAt: new Date(0).toISOString(),
      })),
    }),
  );
}

let fakeKv: ReturnType<typeof makeFakeKv>;

beforeAll(() => {
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token-358";
  process.env.SEAT_SECRET = "test-seat-secret-358";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  delete process.env.REGISTRY_DRIVER;
});

afterAll(() => {
  vi.unstubAllGlobals();
  iso.cleanup();
});

async function putProfile(email: string, body: unknown) {
  const { makeFrenToken } = await import("@/lib/fren-auth");
  const { PUT } = await import("@/app/api/member/profile/route");
  const cookie = `pa-fren=${makeFrenToken(email, "email")}`;
  const req = new Request("http://localhost/api/member/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const res = await PUT(req);
  return { status: res.status, json: (await res.json()) as { ok?: boolean; reason?: string; accountName?: string } };
}

async function getProfile(email: string) {
  const { makeFrenToken } = await import("@/lib/fren-auth");
  const { GET } = await import("@/app/api/member/profile/route");
  const cookie = `pa-fren=${makeFrenToken(email, "email")}`;
  const req = new Request("http://localhost/api/member/profile", { headers: { Cookie: cookie } });
  const res = await GET(req);
  return { status: res.status, json: (await res.json()) as { accountName?: string } };
}

describe("E — profile PUT: the atomic reservation + the 409 path", () => {
  beforeEach(() => {
    fakeKv = makeFakeKv();
    vi.stubGlobal("fetch", fakeKv.fetchStub);
    writeKeyRegistry([]); // clean key-handle registry unless a test overrides it
  });

  it("a fresh email member claims a name — 200, reserved, and the very next GET reads it back", async () => {
    const res = await putProfile("swan@example.com", { accountName: "swanlight", displayName: "swanlight" });
    expect(res.status).toBe(200);
    expect(res.json.accountName).toBe("swanlight");
    expect(fakeKv.store.get("accountname:swanlight")).toBe("swan@example.com");
    const after = await getProfile("swan@example.com");
    expect(after.json.accountName).toBe("swanlight");
  });

  it("a second email member claiming the IDENTICAL name is refused 409 — the first holder is unaffected (the sweep's own reason for existing)", async () => {
    await putProfile("first@example.com", { accountName: "dawnbird", displayName: "dawnbird" });
    const res = await putProfile("second@example.com", { accountName: "dawnbird", displayName: "dawnbird" });
    expect(res.status).toBe(409);
    expect(res.json.reason).toBe("That name is taken. Try another.");
    const first = await getProfile("first@example.com");
    expect(first.json.accountName).toBe("dawnbird");
    const second = await getProfile("second@example.com");
    expect(second.json.accountName).toBe("");
  });

  it("a double submit (a re-tap before the first response painted) — the SAME member's own retried claim reads as success, never a refusal (block 968,624, Love's iPhone walk: 'The name could not be claimed. Try another.')", async () => {
    // Simulates the race window this lane fixes: the FIRST of two
    // near-simultaneous requests has already won the SET…NX reservation
    // by the time THIS one's SET…NX runs — but the holder is the SAME
    // member's own email, not a stranger's, so decideNameClaim reads
    // "mine" and the request proceeds instead of 409ing.
    fakeKv.store.set("accountname:racedname", "racer@example.com");
    const res = await putProfile("racer@example.com", { accountName: "racedname", displayName: "racedname" });
    expect(res.status).toBe(200);
    expect(res.json.accountName).toBe("racedname");
    expect(fakeKv.store.get("accountname:racedname")).toBe("racer@example.com");
  });

  it("a double submit from a DIFFERENT member for the SAME name still refuses — decideNameClaim's 'mine' shortcut never lets a stranger through", async () => {
    fakeKv.store.set("accountname:guarded2", "owner@example.com");
    const res = await putProfile("stranger@example.com", { accountName: "guarded2", displayName: "guarded2" });
    expect(res.status).toBe(409);
    expect(res.json.reason).toBe("That name is taken. Try another.");
  });

  it("iOS autocapitalizes/adds a trailing space claiming a name someone else already holds — normalization still catches the real conflict, never a false success", async () => {
    await putProfile("owner2@example.com", { accountName: "moonchild", displayName: "moonchild" });
    const res = await putProfile("ios-taken@example.com", { accountName: " MoonChild ", displayName: " MoonChild " });
    expect(res.status).toBe(409);
    expect(res.json.reason).toBe("That name is taken. Try another.");
  });

  it("iOS autocapitalizes/adds a trailing space on a fresh claim — normalizes to the same lowercase, trimmed name a plain lowercase claim would produce", async () => {
    const res = await putProfile("ios@example.com", { accountName: " Love ", displayName: " Love " });
    expect(res.status).toBe(200);
    expect(res.json.accountName).toBe("love");
    expect(fakeKv.store.get("accountname:love")).toBe("ios@example.com");
  });

  it("a name that's already a live @onecocreation key handle is refused 409 — no reservation is ever written", async () => {
    writeKeyRegistry([{ handle: "starkeeper", npub: "npub1testkeyhandle0000000000000000000000000000000000000000000" }]);
    const res = await putProfile("hopeful@example.com", { accountName: "starkeeper", displayName: "starkeeper" });
    expect(res.status).toBe(409);
    expect(res.json.reason).toBe("That name is taken. Try another.");
    expect(fakeKv.store.has("accountname:starkeeper")).toBe(false);
  });

  it("re-saving the SAME accountName unchanged never touches the reservation index", async () => {
    await putProfile("echo@example.com", { accountName: "echoname", displayName: "echoname" });
    const before = fakeKv.store.get("accountname:echoname");
    const res = await putProfile("echo@example.com", { accountName: "echoname", displayName: "Echo Name" });
    expect(res.status).toBe(200);
    expect(fakeKv.store.get("accountname:echoname")).toBe(before);
  });

  it("a PUT that never carries accountName (displayName/moneyPrefer only) skips the reservation dance entirely", async () => {
    const res = await putProfile("quiet@example.com", { displayName: "Quiet One" });
    expect(res.status).toBe(200);
    expect(res.json.accountName).toBe("");
    expect(fakeKv.store.size).toBe(1); // only the profile doc — no accountname:* key ever written
  });

  it("a rename releases the OLD reservation only AFTER the new one holds — value-guarded, then claimable by someone else", async () => {
    await putProfile("wanderer@example.com", { accountName: "oldname", displayName: "oldname" });
    expect(fakeKv.store.get("accountname:oldname")).toBe("wanderer@example.com");

    const renamed = await putProfile("wanderer@example.com", { accountName: "newname", displayName: "newname" });
    expect(renamed.status).toBe(200);
    expect(fakeKv.store.get("accountname:newname")).toBe("wanderer@example.com");
    expect(fakeKv.store.has("accountname:oldname")).toBe(false); // released — value-guarded DEL fired

    const claimedByOther = await putProfile("other@example.com", { accountName: "oldname", displayName: "oldname" });
    expect(claimedByOther.status).toBe(200);
    expect(fakeKv.store.get("accountname:oldname")).toBe("other@example.com");
  });

  it("the value-guarded release never deletes a reservation someone ELSE now holds (a defensive proof of the guard, not a claimed real race)", async () => {
    // Simulates the crash-window the route's own comment names: the old
    // reservation key gets manually re-pointed at a third party (as if a
    // prior partial write left it, or a sweep-flagged duplicate resolved
    // by hand) — the release must refuse to delete a value that isn't
    // this member's own.
    await putProfile("guarded@example.com", { accountName: "guardold", displayName: "guardold" });
    fakeKv.store.set("accountname:guardold", "someone-else@example.com"); // simulate a re-pointed reservation
    const res = await putProfile("guarded@example.com", { accountName: "guardnew", displayName: "guardnew" });
    expect(res.status).toBe(200);
    // the guard held — someone-else's reservation was never deleted
    expect(fakeKv.store.get("accountname:guardold")).toBe("someone-else@example.com");
  });
});

describe("F — the follow-up fix: lazy heal for names saved before this lane", () => {
  beforeEach(() => {
    fakeKv = makeFakeKv();
    vi.stubGlobal("fetch", fakeKv.fetchStub);
    writeKeyRegistry([]);
  });

  it("(a) a legacy holder's GET heals the missing reservation — a second member then gets refused 409 for the same name", async () => {
    // Simulate a profile doc saved BEFORE this lane's D5 shipped: an
    // accountName on the doc, but no accountname:* reservation at all —
    // exactly the hole Number One's review found.
    fakeKv.store.set(
      "member:profile:legacy@example.com",
      JSON.stringify({ displayName: "Legacy", accountName: "legacyname", moneyPrefer: null }),
    );
    expect(fakeKv.store.has("accountname:legacyname")).toBe(false);

    const got = await getProfile("legacy@example.com");
    expect(got.status).toBe(200);
    expect(got.json.accountName).toBe("legacyname");
    expect(fakeKv.store.get("accountname:legacyname")).toBe("legacy@example.com"); // healed

    const res = await putProfile("newcomer@example.com", { accountName: "legacyname", displayName: "legacyname" });
    expect(res.status).toBe(409);
    expect(res.json.reason).toBe("That name is taken. Try another.");
  });

  it("(b) a legacy holder's GET never throws and never steals a reservation a twin already holds", async () => {
    // Two members' docs both carry the SAME accountName (a pre-lane
    // duplicate) — one already healed (holds the reservation), one not.
    fakeKv.store.set(
      "member:profile:winner@example.com",
      JSON.stringify({ displayName: "Winner", accountName: "twinname", moneyPrefer: null }),
    );
    fakeKv.store.set(
      "member:profile:loser@example.com",
      JSON.stringify({ displayName: "Loser", accountName: "twinname", moneyPrefer: null }),
    );
    fakeKv.store.set("accountname:twinname", "winner@example.com"); // already healed, winner's side

    const got = await getProfile("loser@example.com");
    expect(got.status).toBe(200); // no throw
    expect(got.json.accountName).toBe("twinname"); // reads back their OWN doc's value
    // the reservation is untouched — still the winner's, never stolen
    expect(fakeKv.store.get("accountname:twinname")).toBe("winner@example.com");
  });

  it("(c) a PUT that resubmits an unchanged, never-reserved name heals it and returns ok", async () => {
    fakeKv.store.set(
      "member:profile:unhealed@example.com",
      JSON.stringify({ displayName: "Old Display", accountName: "unhealedname", moneyPrefer: null }),
    );
    expect(fakeKv.store.has("accountname:unhealedname")).toBe(false);

    const res = await putProfile("unhealed@example.com", { accountName: "unhealedname", displayName: "New Display" });
    expect(res.status).toBe(200);
    expect(res.json.accountName).toBe("unhealedname");
    expect(fakeKv.store.get("accountname:unhealedname")).toBe("unhealed@example.com"); // healed
  });
});
