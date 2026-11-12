import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const mail = vi.hoisted(() => ({ send: vi.fn(), cap: vi.fn() }));
vi.mock("@/lib/mail", () => ({ sendMail: mail.send, capRemaining: mail.cap, brandShell: (s: string) => s }));
vi.mock("@/lib/letters", () => ({ isLetterKey: async (k: string) => k === "moment", getLetterOverride: async () => ({ subject: "a moment_1111", body: "letter" }) }));
vi.mock("@/lib/pwyc-letters", () => ({ offerNotifyTo: () => "love@example.com" }));
vi.mock("@/lib/subscribers", () => ({ siteBase: () => "https://site.example", validEmail: (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) }));
vi.mock("@/lib/operator-auth", () => ({ operatorFromCookieHeader: (c: string) => c === "operator" ? {} : null }));
import { deliveryKv, getScheduleIntent, saveScheduleIntent, letterDeliverySummary, summarizeDelivery, watchDelivery, processDeliveryNotices, lastMailTick, recordMailTick } from "@/lib/letter-delivery";
import { deliveryWords, deliveryNotice } from "@/lib/letter-delivery-copy";
import { getSendRecord, recentSendsForLetter } from "@/lib/mail-queue";
import { GET, PUT } from "@/app/api/admin/letters/intent/route";
const strings = new Map<string, string>();
const hashes = new Map<string, Record<string, string>>();
const lists = new Map<string, string[]>();
const commands: unknown[][] = [];
let outage = false;
let redisError = false;
function command(c: unknown[]) {
  commands.push(c);
  const [op, key, ...args] = c.map(String);
  const h = hashes.get(key) ?? {};
  switch (op) {
    case "GET": return strings.get(key) ?? null;
    case "SET": if (args.includes("NX") && strings.has(key)) return null; strings.set(key, args[0]); return "OK";
    case "HSET": for (let i = 0; i < args.length; i += 2) h[args[i]] = args[i + 1]; hashes.set(key, h); return 1;
    case "HGET": return h[args[0]] ?? null;
    case "HGETALL": return h;
    case "HDEL": delete h[args[0]]; return 1;
    case "LRANGE": return (lists.get(key) ?? []).slice(Number(args[0]), Number(args[1]) + 1);
    case "EVAL": { const lock = String(c[3]); if (strings.get(lock) === c[4]) strings.delete(lock); return 1; }
    default: throw new Error(`unexpected operation: ${op}`);
  }
}
const instant = "2026-11-11T18:11:00.000Z";
const now = Date.parse(instant) + 600_000;
function record(extra: Record<string, string> = {}) {
  const s = { key: "moment", segment: "all", scheduledFor: instant, createdAtMs: String(now - 3600_000), queued: "3", sent: "0", dropped: "0", cancelled: "0", ...extra };
  hashes.set("letters:send:send-1", s); lists.set("letters:sends:moment", ["send-1"]); return s;
}
beforeEach(() => {
  strings.clear(); hashes.clear(); lists.clear(); commands.length = 0; outage = false; redisError = false;
  process.env.KV_REST_API_URL = "https://fixture-kv.invalid"; process.env.KV_REST_API_TOKEN = "fixture";
  process.env.OPERATOR_EMAILS = "admiral@example.com,love@example.com,admiral@example.com";
  mail.send.mockReset().mockResolvedValue(undefined); mail.cap.mockReset().mockResolvedValue(100);
  vi.stubGlobal("fetch", vi.fn(async (_: string, init: RequestInit) => {
    if (outage) return new Response(null, { status: 503 });
    if (redisError) return Response.json({ error: "ERR unavailable" });
    return Response.json({ result: command(JSON.parse(String(init.body))) });
  }));
});
describe("truth from send records", () => {
  it("distinguishes draft, scheduled, sending, completed with drops and cancelled", () => {
    expect(summarizeDelivery([], now).state).toBe("draft");
    const s = { key: "moment", segment: "all", scheduledFor: instant, createdAtMs: now, queued: 3, sent: 0, dropped: 0, cancelled: false };
    expect(summarizeDelivery([s], now - 1000_000).state).toBe("scheduled");
    expect(summarizeDelivery([s], now).state).toBe("sending");
    expect(summarizeDelivery([{ ...s, sent: 1 }], now).state).toBe("sending");
    expect(deliveryWords(summarizeDelivery([{ ...s, sent: 2, dropped: 1 }], now))).toBe("Sent to 2 · 1 not sent");
    expect(summarizeDelivery([{ ...s, cancelled: true }], now).state).toBe("cancelled");
    expect(summarizeDelivery([{ ...s, sent: 3 }, s], now).state).toBe("sending");
  });
  it("an outage is unknown, not Draft or an empty successful history", async () => {
    outage = true;
    expect((await letterDeliverySummary("moment")).state).toBe("unknown");
    await expect(recentSendsForLetter("moment", 8, true)).rejects.toThrow();
    await expect(getSendRecord("x", true)).rejects.toThrow();
  });
  it("Redis errors in HTTP 200 responses are errors", async () => {
    redisError = true;
    await expect(deliveryKv(["GET", "x"])).rejects.toThrow();
    await expect(recentSendsForLetter("moment", 8, true)).rejects.toThrow();
  });
  it("a dangling legacy history record is unknown", async () => {
    lists.set("letters:sends:moment", ["expired"]);
    expect((await letterDeliverySummary("moment")).state).toBe("unknown");
  });
});
describe("remembering an intended time never schedules mail", () => {
  it("persists, reads, clears and does not queue or send", async () => {
    const first = await saveScheduleIntent("moment", instant);
    expect(await saveScheduleIntent("moment", instant)).toEqual(first);
    expect(await getScheduleIntent("moment")).toEqual(first);
    await saveScheduleIntent("moment", null);
    expect(await getScheduleIntent("moment")).toBeNull();
    expect(mail.send).not.toHaveBeenCalled();
    expect(commands.some((c) => c.includes("mail:queue"))).toBe(false);
  });
  it("intent route requires operator auth, known letter and a valid instant", async () => {
    const req = (body: unknown, cookie = "operator") => new Request("https://site.example/api/admin/letters/intent", { method: "PUT", headers: { cookie }, body: JSON.stringify(body) });
    expect((await PUT(req({ key: "moment", at: instant }, ""))).status).toBe(401);
    expect((await PUT(req({ key: "missing", at: instant }))).status).toBe(400);
    expect((await PUT(req({ key: "moment", at: "bad time" }))).status).toBe(400);
    expect((await PUT(req({ key: "moment", at: instant }))).status).toBe(200);
    const r = await GET(new Request("https://site.example/api/admin/letters/intent?key=moment", { headers: { cookie: "operator" } }));
    expect((await r.json()).intent.at).toBe(instant);
  });
});
describe("operator-only notices", () => {
  it("notifies Love once about schedule, then completion; counts actual sent and dropped", async () => {
    const s = record(); await watchDelivery("send-1", "a moment_1111");
    await processDeliveryNotices(now); await processDeliveryNotices(now);
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][1].to).toBe("love@example.com");
    s.sent = "2"; s.dropped = "1";
    await processDeliveryNotices(now); await processDeliveryNotices(now);
    expect(mail.send).toHaveBeenCalledTimes(2);
    expect(mail.send.mock.calls[1][1]).toMatchObject({ subject: "Sent to 2: a moment_1111" });
    expect(mail.send.mock.calls[1][1].html).toContain("1 copies were not sent");
  });
  it("a moved schedule gets a new confirmation, cancellation never reports sent", async () => {
    const s = record(); await watchDelivery("send-1", "a moment_1111");
    await processDeliveryNotices(now); s.scheduledFor = "2026-11-12T18:11:00.000Z";
    await processDeliveryNotices(now); expect(mail.send).toHaveBeenCalledTimes(2);
    s.cancelled = "1"; s.dropped = "3";
    await processDeliveryNotices(now); expect(mail.send).toHaveBeenCalledTimes(2);
  });
  it("missed intent only notes Love and Admiral once; no subscriber queue writes", async () => {
    await saveScheduleIntent("moment", instant);
    await processDeliveryNotices(now); await processDeliveryNotices(now);
    expect(mail.send.mock.calls.map((c) => c[1].to).sort()).toEqual(["admiral@example.com", "love@example.com"]);
    expect(commands.some((c) => c.includes("mail:queue"))).toBe(false);
    expect(mail.send.mock.calls[0][1].html).toContain("Nothing has been sent by this reminder");
  });
  it("future intent, any recorded send, and missing history never trigger a missed note", async () => {
    await saveScheduleIntent("moment", instant);
    await processDeliveryNotices(now - 1000_000); expect(mail.send).not.toHaveBeenCalled();
    record({ cancelled: "1" }); await processDeliveryNotices(now); expect(mail.send).not.toHaveBeenCalled();
    hashes.delete("letters:send:send-1"); await processDeliveryNotices(now); expect(mail.send).not.toHaveBeenCalled();
  });
  it("storage outage never sends a false missed note", async () => {
    await saveScheduleIntent("moment", instant); outage = true;
    await expect(processDeliveryNotices(now)).rejects.toThrow(); expect(mail.send).not.toHaveBeenCalled();
  });
  it("SMTP failure releases the claim and the next tick retries", async () => {
    record(); await watchDelivery("send-1", "a moment_1111"); mail.send.mockRejectedValueOnce(new Error("SMTP down"));
    await processDeliveryNotices(now); await processDeliveryNotices(now); await processDeliveryNotices(now);
    expect(mail.send).toHaveBeenCalledTimes(2);
  });
  it("overlapping ticks send one notification per recipient", async () => {
    record(); await watchDelivery("send-1", "a moment_1111");
    await Promise.all([processDeliveryNotices(now), processDeliveryNotices(now)]);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });
  it("cap exhaustion holds notices for a later tick", async () => {
    record(); await watchDelivery("send-1", "a moment_1111"); mail.cap.mockResolvedValue(0);
    await processDeliveryNotices(now); expect(mail.send).not.toHaveBeenCalled();
    mail.cap.mockResolvedValue(100); await processDeliveryNotices(now); expect(mail.send).toHaveBeenCalledTimes(1);
  });
  it("escapes letter subjects in operator HTML", async () => {
    record(); await watchDelivery("send-1", "<img src=x>"); await processDeliveryNotices(now);
    expect(mail.send.mock.calls[0][1].html).toContain("&lt;img src=x&gt;");
  });
});
it("heartbeat starts unknown and reads the actual recorded completion time", async () => {
  expect(await lastMailTick()).toBeNull(); await recordMailTick(now); expect(await lastMailTick()).toBe(now);
});
it("UI only confirms a record-backed send and registers leave guards", () => {
  const ui = readFileSync(new URL("../src/app/a/letters/[key]/page.tsx", import.meta.url), "utf8");
  expect(ui).toContain("if (!d.recordConfirmed)"); expect(ui).toContain('"beforeunload"'); expect(ui).toContain('"popstate"');
  expect(ui).toContain("deliveryCopy.notQueued"); expect(ui).not.toContain('sendAt ? "scheduled"');
});
it("notice slots include exact Mountain dates and honest partial delivery", () => {
  const words = deliveryNotice("scheduled", { subject: "moment", at: instant, queued: 3, sent: 0, dropped: 0, url: "https://site.example/a/letters/moment" });
  expect(words.body).toContain("11:11"); expect(words.body).toContain("Mountain");
});
