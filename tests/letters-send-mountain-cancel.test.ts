import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { mountainInputToIso, isoToMountainInput, mountainWords, sendRowWords, sendIsChangeable, type SendRecord } from "@/app/a/letters/[key]/page";

/**
 * The Admiral's pins on the send panel (block 975,433):
 *  1. he typed 11:11 from a box an hour west and it was queued for 12:11
 *     Mountain: the field is now read as Mountain Time, whatever the browser's zone;
 *  2. a checkbox names the count instead of typing it back;
 *  3. a Send now button beside Schedule;
 *  4. Cancel and Change time on a send that has not gone out.
 */

const SRC = fs.readFileSync(path.join(process.cwd(), "src/app/a/letters/[key]/page.tsx"), "utf8");

describe("the time field is Mountain Time, never the browser's zone", () => {
  it("11:11 typed on Nov 11 2026 is 11:11 AM Mountain Time (18:11 UTC, MST)", () => {
    expect(mountainInputToIso("2026-11-11T11:11")).toBe("2026-11-11T18:11:00.000Z");
  });
  it("summer time is honoured (MDT, 17:11 UTC)", () => {
    expect(mountainInputToIso("2026-07-01T11:11")).toBe("2026-07-01T17:11:00.000Z");
  });
  it("a blank or broken value is null, never a guessed time", () => {
    expect(mountainInputToIso("")).toBeNull();
    expect(mountainInputToIso("tomorrow")).toBeNull();
  });
  it("round trips back into the field for Change time", () => {
    expect(isoToMountainInput("2026-11-11T18:11:00.000Z")).toBe("2026-11-11T11:11");
  });
  it("says the day and 'Mountain Time' in words", () => {
    expect(mountainWords("2026-11-11T18:11:00.000Z")).toBe("Wednesday, November 11 at 11:11 AM Mountain Time");
  });
  it("the panel never parses the field with the browser's own zone again", () => {
    expect(SRC).not.toContain("new Date(sendAt)");
    expect(SRC).toContain("Mountain Time</span>");
  });
});

describe("checkbox, Send now, Schedule", () => {
  it("the typed-back count is gone; a checkbox names the count", () => {
    expect(SRC).not.toContain("setTyped");
    expect(SRC).toContain('type="checkbox"');
    expect(SRC).toContain("I checked the list. This goes to");
  });
  it("Send now and Schedule are two buttons, and Send now never carries a time", () => {
    expect(SRC).toContain('sendList("now")');
    expect(SRC).toContain('sendList("schedule")');
    expect(SRC).toContain('at: mode === "schedule" && sendAtIso ? sendAtIso : undefined');
  });
  it("the 'Pick the door' heading is gone", () => {
    expect(SRC).not.toContain("Pick the door");
  });
});

describe("recent sends: words and the changeable rule", () => {
  const base: SendRecord = { sendId: "s", queued: 13, sent: 0, dropped: 0, segment: "all", scheduledFor: "2026-11-11T18:11:00.000Z", createdAtMs: 0 };
  it("a waiting send says when, in Mountain Time", () => {
    expect(sendRowWords(base)).toBe("Waiting for Wednesday, November 11 at 11:11 AM Mountain Time · everyone · 13 people");
  });
  it("a cancelled send says so", () => {
    expect(sendRowWords({ ...base, cancelled: true })).toBe("Cancelled · everyone · 13 people");
  });
  it("a send in progress shows its tally", () => {
    expect(sendRowWords({ ...base, sent: 4 })).toBe("Sent to 4 of 13 · everyone");
  });
  it("only a send with nothing out yet can change", () => {
    expect(sendIsChangeable(base)).toBe(true);
    expect(sendIsChangeable({ ...base, sent: 1 })).toBe(false);
    expect(sendIsChangeable({ ...base, cancelled: true })).toBe(false);
  });
  it("Cancel is two presses with the no-going-back words", () => {
    expect(SRC).toContain("There is no going back.");
    expect(SRC).toContain("Yes, cancel it");
  });
});

/* ── tick() obeys the send record: cancel drops, a new time replaces notBefore ── */

const lists = new Map<string, string[]>();
const hashes = new Map<string, Map<string, string>>();
const strings = new Map<string, string>();
function vaultCmd(cmd: unknown[]): unknown {
  const [op, k, ...rest] = cmd as [string, string, ...string[]];
  switch (op) {
    case "LPUSH": { const l = lists.get(k) ?? []; l.unshift(...rest); lists.set(k, l); return l.length; }
    case "RPOP": return lists.get(k)?.pop() ?? null;
    case "LLEN": return lists.get(k)?.length ?? 0;
    case "LRANGE": { const l = lists.get(k) ?? []; const end = Number(rest[1]); return l.slice(Number(rest[0]), end < 0 ? undefined : end + 1); }
    case "HSET": { const h = hashes.get(k) ?? new Map(); for (let i = 0; i + 1 < rest.length; i += 2) h.set(rest[i], rest[i + 1]); hashes.set(k, h); return 1; }
    case "HGETALL": { const h = hashes.get(k); return h ? Object.fromEntries(h) : {}; }
    case "HINCRBY": { const h = hashes.get(k) ?? new Map(); const n = Number(h.get(rest[0]) ?? 0) + Number(rest[1]); h.set(rest[0], String(n)); hashes.set(k, h); return n; }
    case "GET": return strings.get(k) ?? null;
    case "INCR": { const n = Number(strings.get(k) ?? 0) + 1; strings.set(k, String(n)); return n; }
    case "SISMEMBER": return 1;
    default: return null;
  }
}

vi.mock("@/lib/mail", () => ({ sendMail: vi.fn(async () => {}), capRemaining: vi.fn(async () => 100) }));
vi.mock("@/lib/subscribers", () => ({ unsubscribeUrl: () => "https://x/u", isSubscribed: async () => true }));

describe("tick() obeys Cancel and Change time", () => {
  beforeEach(() => {
    lists.clear(); hashes.clear(); strings.clear();
    process.env.KV_REST_API_URL = "https://kv.test";
    process.env.KV_REST_API_TOKEN = "t";
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => ({ ok: true, json: async () => ({ result: vaultCmd(JSON.parse(String(init.body))) }) })));
  });

  async function queueOne(sendId: string, notBefore?: number) {
    const q = await import("@/lib/mail-queue");
    await q.enqueue([{ to: "a@x.org", subject: "s", html: "h", notBefore, guard: { kind: "subscribed" }, sendId }]);
    await q.initSendRecord(sendId, { key: "k", queued: 1, segment: "all", scheduledFor: notBefore ? new Date(notBefore).toISOString() : "next tick" });
    return q;
  }

  it("a cancelled send is dropped, never mailed", async () => {
    const q = await queueOne("c1");
    expect((await q.cancelSend("c1")).ok).toBe(true);
    const r = await q.tick();
    expect(r.sent).toBe(0);
    expect((await q.getSendRecord("c1"))?.dropped).toBe(1);
    expect(r.remainingInQueue).toBe(0);
  });

  it("Change time moves a ripe copy later: it waits", async () => {
    const q = await queueOne("m1", Date.now() - 1000);
    expect((await q.rescheduleSend("m1", Date.now() + 3_600_000)).ok).toBe(true);
    const r = await q.tick();
    expect(r.sent).toBe(0);
    expect(r.remainingInQueue).toBe(1);
  });

  it("Change time moves a later copy earlier: it goes now", async () => {
    const q = await queueOne("m2", Date.now() + 3_600_000);
    expect((await q.rescheduleSend("m2", Date.now() - 1000)).ok).toBe(true);
    const r = await q.tick();
    expect(r.sent).toBe(1);
  });

  it("nothing changes once a copy has gone out", async () => {
    const q = await queueOne("g1");
    await q.tick();
    expect((await q.cancelSend("g1")).ok).toBe(false);
    expect((await q.rescheduleSend("g1", Date.now() + 60_000)).ok).toBe(false);
  });
});
