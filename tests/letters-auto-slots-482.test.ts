import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { OutgoingMail } from "@/lib/mail";

/* ── hoisted mocks, top level (vitest hoists vi.mock regardless of where it
   sits, so it lives here to say what it actually does) — used only by the
   last describe below; the slot-store and admin-route specs never call
   sendMail or the subscriber guards, so this mock is inert for them. ── */

const sent = vi.hoisted(() => [] as OutgoingMail[]);
const onceWithinClaims = vi.hoisted(() => new Set<string>());

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (_persona: string, mail: OutgoingMail) => {
      sent.push(mail);
    },
    capRemaining: async () => 100,
    onceWithin: async (k: string) => {
      if (onceWithinClaims.has(k)) return false;
      onceWithinClaims.add(k);
      return true;
    },
  };
});

vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return {
    ...actual,
    subscribersConfigured: () => true,
    isSubscribed: async () => true,
    markReadingConfirmed: async () => {},
  };
});

/**
 * TASK-482 part 2 — the "Sends automatically" slot (`letters:auto`): a KV
 * doc mapping each automatic send ("reading-confirm" | "reading-dayof") to
 * at most one composed-letter key, settable from `/a/letters/[key]`'s own
 * row via the new `/api/admin/letters/slots` route. When a slot is SET it
 * overrides `reading-letters.ts`'s hardcoded default (T-482's own hotfix);
 * when it is unset, the hardcoded default (and under that, the built-in
 * words) still applies — this file never re-pins that fallback chain,
 * already covered by `tests/reading-letters-composed-482.test.ts`.
 *
 * The KV rail is the same in-memory REST stub `tests/letters-send.test.ts`
 * uses (GET/SET/DEL over a plain Map), so `@/lib/letters` runs for real;
 * the route handlers run for real behind a real operator cookie (also
 * `letters-send.test.ts`'s own idiom) so the 401 without one is a genuine
 * auth check, not a mock standing in for it.
 */

const vault = new Map<string, string>();

function vaultReset() {
  vault.clear();
}

function stubKv() {
  vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) => {
    const cmd = JSON.parse(init?.body ?? "[]") as [string, ...string[]];
    switch (cmd[0]) {
      case "GET":
        return Response.json({ result: vault.get(cmd[1]) ?? null });
      case "SET":
        vault.set(cmd[1], cmd[2]);
        return Response.json({ result: "OK" });
      case "DEL":
        vault.delete(cmd[1]);
        return Response.json({ result: 1 });
      default:
        return Response.json({ result: null });
    }
  });
}

let cookie: string;

const req = (url: string, init?: RequestInit) =>
  new Request(`http://localhost${url}`, {
    ...init,
    headers: { cookie, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

beforeAll(async () => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
});

beforeEach(() => {
  vaultReset();
  stubKv();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ═══════════════════════ the slot store (src/lib/letters.ts) ═══════════ */

describe("the letters:auto slot store", () => {
  it("an unset slot reads back as null, and no letter holds it", async () => {
    const { getAutoSlotLetter, getLetterAutoSlotOf } = await import("@/lib/letters");
    expect(await getAutoSlotLetter("reading-confirm")).toBeNull();
    expect(await getLetterAutoSlotOf("anything")).toBeNull();
  });

  it("setLetterAutoSlot moves a letter onto a slot, and it reads back both ways", async () => {
    const { setLetterAutoSlot, getAutoSlotLetter, getLetterAutoSlotOf } = await import("@/lib/letters");
    await setLetterAutoSlot("weekly-reading-with-love", "reading-confirm");
    expect(await getAutoSlotLetter("reading-confirm")).toBe("weekly-reading-with-love");
    expect(await getLetterAutoSlotOf("weekly-reading-with-love")).toBe("reading-confirm");
  });

  it("moving a slot onto letter B clears letter A's hold on it — a slot holds one letter", async () => {
    const { setLetterAutoSlot, getAutoSlotLetter, getLetterAutoSlotOf } = await import("@/lib/letters");
    await setLetterAutoSlot("letter-a", "reading-confirm");
    expect(await getAutoSlotLetter("reading-confirm")).toBe("letter-a");
    await setLetterAutoSlot("letter-b", "reading-confirm");
    expect(await getAutoSlotLetter("reading-confirm")).toBe("letter-b");
    expect(await getLetterAutoSlotOf("letter-a")).toBeNull();
    expect(await getLetterAutoSlotOf("letter-b")).toBe("reading-confirm");
  });

  it("a letter holds at most one slot — moving it onto a second slot clears the first", async () => {
    const { setLetterAutoSlot, getAutoSlotLetter, getLetterAutoSlotOf } = await import("@/lib/letters");
    await setLetterAutoSlot("one-letter", "reading-confirm");
    await setLetterAutoSlot("one-letter", "reading-dayof");
    expect(await getAutoSlotLetter("reading-confirm")).toBeNull();
    expect(await getAutoSlotLetter("reading-dayof")).toBe("one-letter");
    expect(await getLetterAutoSlotOf("one-letter")).toBe("reading-dayof");
  });

  it("setLetterAutoSlot(key, null) clears the letter off every slot", async () => {
    const { setLetterAutoSlot, getAutoSlotLetter } = await import("@/lib/letters");
    await setLetterAutoSlot("soon-cleared", "reading-dayof");
    await setLetterAutoSlot("soon-cleared", null);
    expect(await getAutoSlotLetter("reading-dayof")).toBeNull();
  });

  it("fails CLOSED to no slot when the vault errors — never throws", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("simulated KV outage");
    });
    const { getAutoSlots, getAutoSlotLetter, getLetterAutoSlotOf } = await import("@/lib/letters");
    await expect(getAutoSlots()).resolves.toEqual({});
    await expect(getAutoSlotLetter("reading-confirm")).resolves.toBeNull();
    await expect(getLetterAutoSlotOf("whoever")).resolves.toBeNull();
  });
});

/* ═══════════════════════ the admin route ═══════════════════════════════ */

describe("/api/admin/letters/slots", () => {
  const slotsGET = async () => (await import("@/app/api/admin/letters/slots/route")).GET;
  const slotsPUT = async () => (await import("@/app/api/admin/letters/slots/route")).PUT;

  it("refuses GET and PUT without the operator cookie", async () => {
    const getRes = await (await slotsGET())(new Request("http://localhost/api/admin/letters/slots"));
    expect(getRes.status).toBe(401);
    const putRes = await (await slotsPUT())(
      new Request("http://localhost/api/admin/letters/slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "news-sample", slot: "reading-confirm" }),
      }),
    );
    expect(putRes.status).toBe(401);
  });

  it("rejects an unknown letter key", async () => {
    const res = await (await slotsPUT())(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: "not-a-real-letter", slot: "reading-confirm" }) }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
  });

  it("rejects an unknown slot name", async () => {
    const res = await (await slotsPUT())(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: "news-sample", slot: "not-a-real-slot" }) }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT sets the slot, GET reflects it, and PUT with slot:null clears it — a seeded key qualifies too", async () => {
    const putRes = await (await slotsPUT())(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: "news-sample", slot: "reading-dayof" }) }),
    );
    expect(await putRes.json()).toEqual({ ok: true });

    const getRes = await (await slotsGET())(req("/api/admin/letters/slots"));
    expect(await getRes.json()).toEqual({ ok: true, slots: { "reading-dayof": "news-sample" } });

    const clearRes = await (await slotsPUT())(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: "news-sample", slot: null }) }),
    );
    expect(await clearRes.json()).toEqual({ ok: true });
    const getRes2 = await (await slotsGET())(req("/api/admin/letters/slots"));
    expect(await getRes2.json()).toEqual({ ok: true, slots: {} });
  });

  it("a composed letter (createLetter, not just the seeded set) also qualifies for a slot", async () => {
    const { createLetter } = await import("@/lib/letters");
    const { key } = await createLetter({ title: "Weekly Reading with Love #2", audience: "list" });
    const res = await (await slotsPUT())(req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key, slot: "reading-dayof" }) }));
    expect(await res.json()).toEqual({ ok: true });
  });
});

/* ═══════════ the slot overrides reading-letters.ts's hardcoded default ═══ */

describe("a set slot overrides reading-letters.ts's hardcoded default (T-482 order)", () => {
  beforeEach(() => {
    sent.length = 0;
    onceWithinClaims.clear();
    process.env.NEXT_PUBLIC_SITE_URL = "https://reading-test.example";
  });

  it("a slot pointed at a DIFFERENT letter is used instead of weekly-reading-with-love, even though that default key has no words either", async () => {
    const { setLetterAutoSlot, saveLetterOverride } = await import("@/lib/letters");
    await saveLetterOverride("her-other-letter", {
      subject: "A different note entirely",
      body: "This is the slot's own letter, not the hardcoded default.",
      audience: "members",
    });
    await setLetterAutoSlot("her-other-letter", "reading-confirm");

    const { buildReadingConfirmationLetter } = await import("@/lib/reading-letters");
    const mail = await buildReadingConfirmationLetter("reader@example.com");
    expect(mail.subject).toBe("A different note entirely");
    expect(mail.html).toContain("This is the slot's own letter, not the hardcoded default.");
  });

  it("the same holds for the day-of slot against weekly-reading-with-love-2", async () => {
    const { setLetterAutoSlot, saveLetterOverride } = await import("@/lib/letters");
    await saveLetterOverride("a-different-dayof-letter", {
      subject: "Tonight, a different way",
      body: "Her slot pick, not the hardcoded default.",
      audience: "members",
    });
    await setLetterAutoSlot("a-different-dayof-letter", "reading-dayof");

    const { buildReadingDayOfLetter } = await import("@/lib/reading-letters");
    const mail = await buildReadingDayOfLetter("reader@example.com", Date.now() + 3600_000, "America/Denver");
    expect(mail.subject).toBe("Tonight, a different way");
    expect(mail.html).toContain("Her slot pick, not the hardcoded default.");
  });

  it("with no slot set, the hardcoded default (weekly-reading-with-love) still applies", async () => {
    const { saveLetterOverride } = await import("@/lib/letters");
    await saveLetterOverride("weekly-reading-with-love", {
      subject: "The default itself",
      body: "No slot was ever set, so this default applies.",
      audience: "members",
    });
    const { buildReadingConfirmationLetter } = await import("@/lib/reading-letters");
    const mail = await buildReadingConfirmationLetter("reader@example.com");
    expect(mail.subject).toBe("The default itself");
  });
});
