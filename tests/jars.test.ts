import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-134 (0018.06.17 a₿) — THE JARS FOLLOW THE SWITCHES. Pins:
 *  · jarsOpen() is false when features.jars is OFF (even with the bitcoin
 *    rail live)
 *  · jarsOpen() is false when the bitcoin rail isn't live — either the
 *    payments.btcpay switch is OFF, or it's ON but BTCPay isn't
 *    env-configured — even though features.jars is ON
 *  · jarsOpen() is true only when both are true
 *  · the payforward jar's LABEL is "Gifts of Gratitude" in TipJar's own
 *    JARS table, its KEY stays `payforward` (ledger continuity) — "Tip
 *    Love" / "Tip One Cocreation" are untouched
 *
 * Same stub-before-import + fs-driver pattern as tests/site-config.test.ts:
 * the env this module reads at call time is real (btcpayEnv() is read
 * fresh on every call, no caching), so switches are set with
 * saveSiteConfig() and env vars are set directly — no mocking needed.
 */

const FILE = path.join(process.cwd(), "data", "site-config.json");

let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let jarsOpen: (typeof import("@/lib/payments"))["jarsOpen"];
let JARS: (typeof import("@/components/TipJar"))["JARS"];

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  await fs.rm(FILE, { force: true });
  ({ saveSiteConfig, getSiteConfig } = await import("@/lib/site-config"));
  ({ jarsOpen } = await import("@/lib/payments"));
  ({ JARS } = await import("@/components/TipJar"));
});

afterEach(async () => {
  delete process.env.BTCPAY_URL;
  delete process.env.BTCPAY_STORE_ID;
  delete process.env.BTCPAY_API_KEY;
  await fs.rm(FILE, { force: true });
  await getSiteConfig(); // re-warm the cache to defaults for the next test
});

afterAll(async () => {
  await fs.rm(FILE, { force: true });
});

function configureBtcpay() {
  process.env.BTCPAY_URL = "https://btcpay.jars-test.invalid";
  process.env.BTCPAY_STORE_ID = "jars-test-store";
  process.env.BTCPAY_API_KEY = "jars-test-key";
}

describe("jarsOpen() — features.jars AND the bitcoin rail live, or the block is gone", () => {
  it("false when features.jars is OFF, even with a fully live bitcoin rail", async () => {
    configureBtcpay();
    await saveSiteConfig({ features: { jars: false }, payments: { btcpay: true } });
    expect(jarsOpen()).toBe(false);
  });

  it("false when the payments.btcpay switch is OFF, even though jars is ON", async () => {
    configureBtcpay();
    await saveSiteConfig({ features: { jars: true }, payments: { btcpay: false } });
    expect(jarsOpen()).toBe(false);
  });

  it("false when the btcpay switch is ON but BTCPay isn't env-configured", async () => {
    await saveSiteConfig({ features: { jars: true }, payments: { btcpay: true } });
    expect(jarsOpen()).toBe(false); // no BTCPAY_URL/STORE_ID/API_KEY set
  });

  it("true only once jars is ON, the switch is ON, and the rail is env-configured", async () => {
    configureBtcpay();
    await saveSiteConfig({ features: { jars: true }, payments: { btcpay: true } });
    expect(jarsOpen()).toBe(true);
  });
});

describe("the payforward jar's LABEL is Gifts of Gratitude; the KEY never moves", () => {
  it("TipJar's own JARS table", () => {
    const payforward = JARS.find((j) => j.key === "payforward");
    expect(payforward?.title).toBe("Gifts of Gratitude");
    expect(payforward?.key).toBe("payforward"); // ledger continuity — never rename the key
    expect(JARS.find((j) => j.key === "love")?.title).toBe("Tip Love");
    expect(JARS.find((j) => j.key === "onecocreation")?.title).toBe("Tip One Cocreation");
  });
});
