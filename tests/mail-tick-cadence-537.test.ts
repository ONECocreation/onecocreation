import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * TASK-537 part 2 (gap 2), option 2b. The Vercel plan is HOBBY, so crons
 * stay daily and vercel.json is NOT edited (the three daily pulls are still
 * pinned by tests/reading-letters.test.ts). The start letter's 45-minute
 * window is reached by a closer pull from the box's own crontab, which
 * calls the tick with the seat-secret header. This file pins that door:
 * the tick must authorize `x-seat-secret`, and refuse a wrong or missing one.
 */

vi.mock("@/lib/mail-queue", () => ({
  tick: async () => ({ sent: 0, failed: 0, requeued: 0, remainingInQueue: 0, capLeftThisHour: 100 }),
}));
vi.mock("@/lib/reading-letters", () => ({ enqueueReadingDayOf: async () => ({}) }));
vi.mock("@/lib/join-letters", () => ({ enqueueJoinLetters: async () => ({}) }));
vi.mock("@/lib/reading-week-drafts", () => ({ draftReadingLetters: async () => ({ nextReading: "held", replay: "held", reviewSent: 0 }) }));

describe("the tick's seat-secret door (the box's crontab line rides it)", () => {
  it("the route source reads the x-seat-secret header", () => {
    const src = readFileSync(resolve(__dirname, "../src/app/api/mail/tick/route.ts"), "utf8");
    expect(src).toContain("x-seat-secret");
  });

  it("a request carrying the right secret is not refused; a wrong or missing one is", async () => {
    process.env.SEAT_SECRET = "fixture-seat-secret";
    const { GET } = await import("@/app/api/mail/tick/route");
    const url = "https://cadence.example/api/mail/tick";
    const good = await GET(new Request(url, { headers: { "x-seat-secret": "fixture-seat-secret" } }));
    expect(good.status).not.toBe(401);
    expect(good.status).not.toBe(403);
    const bad = await GET(new Request(url, { headers: { "x-seat-secret": "nope" } }));
    expect([401, 403]).toContain(bad.status);
    const none = await GET(new Request(url));
    expect([401, 403]).toContain(none.status);
  });

  it("vercel.json stays at the three daily crons (Hobby: no sub-daily entry, T-537 option 2b)", () => {
    const cfg = JSON.parse(readFileSync(resolve(__dirname, "../vercel.json"), "utf8")) as { crons: Array<{ path: string; schedule: string }> };
    const tick = cfg.crons.filter((c) => c.path === "/api/mail/tick");
    expect(tick).toHaveLength(3);
    for (const c of tick) expect(c.schedule).toMatch(/^\d+ \d+ \* \* \*$/);
  });
});
