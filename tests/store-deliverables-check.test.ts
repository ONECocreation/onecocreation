import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-291 (0018.06.25 a₿ · block 967,144) — the Admiral: "need to ensure
 * that all of meditation items have a digital download. i would like to
 * see a test of each of these items." Pins GET
 * /api/admin/store/deliverables:
 *
 *  1. 401 with no operator cookie.
 *  2. A three-item fixture catalog (one complete deliverable, one digital
 *     item carrying no deliverable at all, one whose file went missing
 *     from the dev driver's disk) answers exactly per item.
 *  3. THE LEAK RULE holds here too: no response body — the 401 or the 200
 *     — ever carries `blobPath` or the fixture's own file basenames.
 *
 * KV rides the same stateful-fixture-fetch pattern as cart-checkout.test.ts
 * / money-desk.test.ts (a real Request, a real operator cookie minted with
 * the house's own makeOperatorToken). The dev-driver file check reads
 * `process.cwd()` (src/app/api/admin/store/deliverables/route.ts, mirroring
 * the download route) — isolateCwd (TASK-158's helper) chdir's into a
 * throwaway temp dir first so this test never touches the repo's own
 * data/deliverables/.
 */

const { dir: TMP_DIR, cleanup } = isolateCwd("task-291-deliverables-");

const KV_URL = "http://kv.fixture";

const CATALOG = {
  schemaVersion: 2,
  items: [
    {
      id: "complete-meditation",
      schemaVersion: 2,
      title: "Complete Meditation",
      blurb: "the file is really there",
      images: [],
      media: {
        images: [],
        deliverable: { kind: "audio", label: "the audio", blobPath: "deliverables/fixture-complete.mp3" },
      },
      kind: "digital",
      price: { sats: 11111 },
      fulfillment: "digital",
      status: "live",
    },
    {
      id: "no-deliverable-meditation",
      schemaVersion: 2,
      title: "No Deliverable Meditation",
      blurb: "a digital good with nothing attached yet",
      images: [],
      kind: "digital",
      price: { sats: 12000 },
      fulfillment: "digital",
      status: "live",
    },
    {
      id: "missing-file-meditation",
      schemaVersion: 2,
      title: "Missing File Meditation",
      blurb: "the deliverable is recorded but the file is gone",
      images: [],
      media: {
        images: [],
        deliverable: { kind: "audio", label: "the gone audio", blobPath: "deliverables/fixture-gone.mp3" },
      },
      kind: "digital",
      price: { sats: 13000 },
      fulfillment: "digital",
      status: "live",
    },
    {
      id: "a-ware-not-digital",
      schemaVersion: 2,
      title: "A Ware, Not Digital",
      blurb: "kind !== digital and no deliverable — never listed here",
      images: [],
      kind: "self",
      price: { sats: 5000 },
      fulfillment: "self",
      status: "live",
    },
  ],
};

const kvStore = new Map<string, string>();
let operatorCookie: string;

beforeAll(async () => {
  await fs.mkdir(path.join(TMP_DIR, "data", "deliverables"), { recursive: true });
  // ONLY "complete-meditation"'s file actually lands on disk — the other
  // deliverable-carrying item names a file that never arrives
  await fs.writeFile(path.join(TMP_DIR, "data", "deliverables", "fixture-complete.mp3"), "fixture audio bytes");

  delete process.env.VERCEL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = "fixture-kv-token";
  process.env.SEAT_SECRET = "task-291-test-seat-secret";

  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;

  kvStore.set("store:catalog", JSON.stringify(CATALOG));

  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u === KV_URL) {
      const cmd = JSON.parse(String(init?.body)) as unknown[];
      const [op, key, value] = cmd.map(String);
      let result: unknown = null;
      if (op === "GET") result = kvStore.get(key) ?? null;
      else if (op === "SET") {
        kvStore.set(key, value);
        result = "OK";
      } else if (op === "DEL") {
        result = kvStore.delete(key) ? 1 : 0;
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    throw new Error(`store-deliverables-check test: unexpected fetch ${u}`);
  });
});

afterAll(() => {
  cleanup();
});

async function get(cookie?: string) {
  const { GET } = await import("@/app/api/admin/store/deliverables/route");
  return GET(
    new Request("http://localhost/api/admin/store/deliverables", {
      headers: cookie ? { cookie } : {},
    })
  );
}

describe("GET /api/admin/store/deliverables — the operator gate", () => {
  it("refuses with no operator cookie", async () => {
    const res = await get();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });
});

describe("GET /api/admin/store/deliverables — the check, per item", () => {
  it("answers exactly for the complete / missing-deliverable / missing-file / non-digital fixture", async () => {
    const res = await get(operatorCookie);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const byId = Object.fromEntries((data.items as Array<Record<string, unknown>>).map((c) => [c.id, c]));

    // the non-digital item with no deliverable never appears
    expect(Object.keys(byId)).toHaveLength(3);
    expect(byId["a-ware-not-digital"]).toBeUndefined();

    expect(byId["complete-meditation"]).toMatchObject({
      title: "Complete Meditation",
      kind: "digital",
      hasDeliverable: true,
      label: "the audio",
      blobAnswers: true,
    });
    expect(byId["no-deliverable-meditation"]).toMatchObject({
      title: "No Deliverable Meditation",
      kind: "digital",
      hasDeliverable: false,
      label: null,
      blobAnswers: null,
    });
    expect(byId["missing-file-meditation"]).toMatchObject({
      title: "Missing File Meditation",
      kind: "digital",
      hasDeliverable: true,
      label: "the gone audio",
      blobAnswers: false,
    });
  });

  it("THE LEAK RULE holds here too: no response body ever carries blobPath or a deliverable filename", async () => {
    const denied = await get();
    const deniedText = await denied.text();
    expect(deniedText).not.toContain("blobPath");

    const res = await get(operatorCookie);
    const text = await res.text();
    expect(text).not.toContain("blobPath");
    expect(text).not.toContain("fixture-complete.mp3");
    expect(text).not.toContain("fixture-gone.mp3");
    expect(text).not.toContain("deliverables/");
  });
});
