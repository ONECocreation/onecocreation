/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * T-541a: the REAL subscription flow against Square's SANDBOX, through the
 * site's own library code (not mocks): plan listing, customer + card on
 * file, CreateSubscription with RELATIVE-phase order templates, upgrade
 * (difference payment + SwapPlan), cancel, undo, cancel. Run:
 *
 *   set -a; . ~/dev/briefings/oc-subscriptions-969584/.sandbox.env; set +a
 *   npx vitest run --config scripts/vitest.sandbox.config.ts
 *
 * HARD-FAILS on anything but SQUARE_ENVIRONMENT=sandbox. Never prints the
 * token. Uses the sandbox card nonce `cnon:card-nonce-ok`. Needs the spike's
 * catalog (three SPIKE plans) to exist in the sandbox account.
 */
import { describe, it, expect } from "vitest";
import os from "os";
import fs from "fs";
import path from "path";

if (process.env.SQUARE_ENVIRONMENT !== "sandbox" || !process.env.SQUARE_ACCESS_TOKEN) {
  throw new Error("HARD FAIL: this smoke runs only with SQUARE_ENVIRONMENT=sandbox and a token in the environment");
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oc-sub-smoke-"));
fs.mkdirSync(path.join(dir, "data"), { recursive: true });
process.chdir(dir);
if (!process.env.SQUARE_LOCATION_ID) {
  // the sandbox env file carries no location id: read it from the sandbox host (the one host this script may call)
  const r = await fetch("https://connect.squareupsandbox.com/v2/locations", { headers: { Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`, "Square-Version": "2025-01-23" } });
  process.env.SQUARE_LOCATION_ID = ((await r.json()) as { locations?: { id: string }[] }).locations?.[0]?.id ?? "";
  if (!process.env.SQUARE_LOCATION_ID) throw new Error("HARD FAIL: no sandbox location");
}
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.REDIS_URL;

describe("sandbox smoke", () => {
  it("subscribe, upgrade, cancel, undo, cancel against connect.squareupsandbox.com", async () => {
    const subs = await import("@/lib/subscriptions");
    const payments = await import("@/lib/payments");
    const { getEntitlement } = await import("@/lib/entitlement");
    await payments.ensureSquareVault();
    expect(payments.squareEnv()?.environment).toBe("sandbox"); // the lib derives the host from this

    const plans = await subs.listSquarePlans();
    const idByName = (needle: string) => plans.flatMap((p) => p.variations).find((v) => v.name.includes(needle) && v.phases.length === 1 && v.phases[0].pricing === "RELATIVE")?.id;
    const A = idByName("Weekly Intuitive Monthly"), B = idByName("Observer Monthly"), C = idByName("Evening Star Monthly");
    expect(A && B && C).toBeTruthy();
    console.log("plans listed:", plans.length, "| map picks:", { A, B, C });
    const map = await subs.savePlanMap({ tiers: { A: { standard: A }, B: { standard: B }, C: { standard: C } } });
    expect(map.tiers.B?.standard).toBe(B);

    const stamp = Date.now();
    const subject = `oc.smoke.${stamp}@gmail.com@email`;
    const rec = await subs.subscribe(subject, "A", "standard", "cnon:card-nonce-ok", `smoke-${stamp}`);
    console.log("subscribed:", rec.status, rec.tier, "expires", new Date(rec.expiresAtMs ?? 0).toISOString());
    expect(rec.status).toBe("active");
    expect((await getEntitlement(subject))?.tier).toBe("A");

    const up = await subs.upgrade(subject, "B");
    console.log("upgraded:", up.tier, "pendingSwap", JSON.stringify(up.pendingSwap));
    expect(up.tier).toBe("B");
    expect(up.pendingSwap?.scheduled).toBe(true);
    expect((await getEntitlement(subject))?.tier).toBe("B");

    const c1 = await subs.cancel(subject);
    console.log("cancelled:", c1.status, "expires", new Date(c1.expiresAtMs ?? 0).toISOString());
    expect(c1.status).toBe("cancelling");
    const u = await subs.undoCancel(subject);
    expect(u.status).toBe("active");
    const c2 = await subs.cancel(subject);
    expect(c2.status).toBe("cancelling");
    expect((await getEntitlement(subject))?.tier).toBe("B");
    console.log("SMOKE OK for", rec.subscriptionId);
  });
});
