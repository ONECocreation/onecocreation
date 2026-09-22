import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * TASK-388 (block 968,088) — the subscribe route's `"reading"` branch:
 * tags the subscriber via the narrow seam (`addReadingTag`, subscribers.ts)
 * and sends NO letter (decision C) — the wrong letter (the lead-magnet
 * path `tests/read-with-love-letter.test.ts` already pins for every other
 * source) is worse than none. The three honest outcomes (joined/already/
 * unsubscribed) round-trip to the route's own JSON shape.
 *
 * The mail rail, the lead-magnet letters, and the subscribers rail are all
 * mocked — this spec pins the ROUTE's branch, not SMTP or KV (the same
 * split `tests/read-with-love-letter.test.ts` already draws).
 */

const leadMagnetCalls = vi.hoisted(() => [] as string[]);
const readingTagCalls = vi.hoisted(() => [] as string[]);
const ctl = vi.hoisted(() => ({ outcome: "joined" as "joined" | "already" | "unsubscribed" }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return { ...actual, mailConfigured: () => true };
});

vi.mock("@/lib/lead-magnet", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/lead-magnet")>();
  return {
    ...actual,
    sendLeadMagnetLetter: async () => {
      leadMagnetCalls.push("lead-magnet");
    },
    sendReadWithLoveLetter: async () => {
      leadMagnetCalls.push("read-with-love");
    },
    enqueueDayTwoWelcome: async () => {
      leadMagnetCalls.push("day-two");
    },
  };
});

vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return {
    ...actual,
    subscribersConfigured: () => true,
    addSubscriber: async () => ({ added: true, already: false }),
    addReadingTag: async (email: string) => {
      readingTagCalls.push(email);
      return { outcome: ctl.outcome };
    },
  };
});

const route = () => import("@/app/api/subscribe/route");

function join(source: string, email = "reader@example.com") {
  return new Request("http://test/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source }),
  });
}

beforeEach(() => {
  leadMagnetCalls.length = 0;
  readingTagCalls.length = 0;
  ctl.outcome = "joined";
});

describe("the subscribe route's reading branch (TASK-388)", () => {
  it("source:'reading' calls the narrow seam and sends no letter (decision C) — the lead-magnet path is NOT taken", async () => {
    const { POST } = await route();
    const res = await POST(join("reading"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, outcome: "joined" });
    expect(readingTagCalls).toEqual(["reader@example.com"]);
    expect(leadMagnetCalls).toEqual([]); // the wrong-letter guard, mechanically pinned
  });

  it("the already-in outcome round-trips honestly", async () => {
    ctl.outcome = "already";
    const { POST } = await route();
    const res = await POST(join("reading"));
    expect(await res.json()).toEqual({ ok: true, outcome: "already" });
    expect(leadMagnetCalls).toEqual([]);
  });

  it("the unsubscribed outcome round-trips honestly — never silently resubscribed", async () => {
    ctl.outcome = "unsubscribed";
    const { POST } = await route();
    const res = await POST(join("reading"));
    expect(await res.json()).toEqual({ ok: true, outcome: "unsubscribed" });
    expect(leadMagnetCalls).toEqual([]);
  });

  it("every other source's path is untouched — footer still gets the lead magnet and the day-two drip, never the reading seam", async () => {
    const { POST } = await route();
    const res = await POST(join("footer"));
    expect(res.status).toBe(200);
    expect(leadMagnetCalls).toEqual(["lead-magnet", "day-two"]);
    expect(readingTagCalls).toEqual([]);
  });

  it("readwithlove still gets ITS OWN letter, untouched by this lane's branch", async () => {
    const { POST } = await route();
    const res = await POST(join("readwithlove"));
    expect(res.status).toBe(200);
    expect(leadMagnetCalls).toEqual(["read-with-love"]);
    expect(readingTagCalls).toEqual([]);
  });
});
