import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { OutgoingMail } from "@/lib/mail";

/* ── hoisted mocks, top level (vitest hoists vi.mock regardless of where it
   sits, so it lives here to say what it actually does) — used only by the
   last describe below; every other describe in this file never calls
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
 * TASK-482 part 2, REVISED after review (block 968,624+) — the
 * "Sends automatically" slot (`letters:auto:<slot>`, ONE KV key per slot):
 * which composed letter, if any, rides each automatic send
 * ("reading-confirm" | "reading-dayof"). Three raw states per slot:
 * absent (the hardcoded default applies), the literal `AUTO_SLOT_BUILTIN`
 * ("builtin" — Love's letters explicitly off), or a composed letter's
 * key. `effectiveAutoSlot()` (reading-letters.ts) resolves that triad for
 * BOTH the send path and this admin route's GET.
 *
 * Fixed by this revision:
 *  - BLOCKER 1: only a COMPOSED letter may ever hold a slot — a seeded
 *    letter's {{placeholders}} would go out raw. Enforced in the PUT
 *    (400 otherwise) and in the resolution (a stale/non-composed key is
 *    ignored, treated as unset).
 *  - BLOCKER 2: the default letter's row must show its OWN slot as
 *    active (GET returns the EFFECTIVE key, default applied), and
 *    choosing "Not automatic" on it must actually turn Love's letters
 *    off (writes the literal "builtin" — never a silent fallback to the
 *    SAME letter via an absent slot).
 *  - SHOULD-FIX: each slot is its OWN KV key — two writes to DIFFERENT
 *    slots can never clobber each other (no whole-doc read-modify-write).
 *
 * The KV rail is the same in-memory REST stub `tests/letters-send.test.ts`
 * uses (GET/SET/DEL over a plain Map), so `@/lib/letters` runs for real;
 * the route handlers run for real behind a real operator cookie.
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
  process.env.NEXT_PUBLIC_SITE_URL = "https://reading-test.example";
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

/** Composes a letter, ready to hold a slot — helper only, no send words. */
async function composeLetter(title: string) {
  const { createLetter } = await import("@/lib/letters");
  return (await createLetter({ title, audience: "list" })).key;
}

/** Registers `key` as a real COMPOSED letter (production reality: both
 *  hardcoded defaults, weekly-reading-with-love and -2, already exist as
 *  Love's own composed letters) — a slot's PUT gates on `isLetterKey`,
 *  which a bare `saveLetterOverride` call never satisfies on its own. */
async function composeDefault(key: string, title: string) {
  const { createLetter } = await import("@/lib/letters");
  await createLetter({ key, title, audience: "list" });
}

/* ═══════════════════════ the per-slot raw KV store ══════════════════════ */

describe("the letters:auto:<slot> raw store — one KV key per slot", () => {
  it("an unset slot reads back as null", async () => {
    const { getAutoSlotLetter } = await import("@/lib/letters");
    expect(await getAutoSlotLetter("reading-confirm")).toBeNull();
    expect(await getAutoSlotLetter("reading-dayof")).toBeNull();
  });

  it("setAutoSlotRaw writes exactly this slot's own KV key — a write to one slot never touches the other", async () => {
    const { setAutoSlotRaw, getAutoSlotLetter } = await import("@/lib/letters");
    await setAutoSlotRaw("reading-confirm", "letter-a");
    expect(await getAutoSlotLetter("reading-confirm")).toBe("letter-a");
    expect(await getAutoSlotLetter("reading-dayof")).toBeNull(); // untouched
    expect(vault.size).toBe(1); // exactly one KV key written
    expect([...vault.keys()]).toEqual(["letters:auto:reading-confirm"]);
  });

  it("setAutoSlotRaw(slot, null) clears that slot's own key back to absent", async () => {
    const { setAutoSlotRaw, getAutoSlotLetter } = await import("@/lib/letters");
    await setAutoSlotRaw("reading-dayof", "letter-b");
    await setAutoSlotRaw("reading-dayof", null);
    expect(await getAutoSlotLetter("reading-dayof")).toBeNull();
  });

  it("setAutoSlotRaw can write the literal AUTO_SLOT_BUILTIN sentinel", async () => {
    const { setAutoSlotRaw, getAutoSlotLetter, AUTO_SLOT_BUILTIN } = await import("@/lib/letters");
    await setAutoSlotRaw("reading-confirm", AUTO_SLOT_BUILTIN);
    expect(await getAutoSlotLetter("reading-confirm")).toBe("builtin");
  });

  it("SHOULD-FIX: two concurrent writes to DIFFERENT slots never clobber each other", async () => {
    const { setAutoSlotRaw, getAutoSlotLetter } = await import("@/lib/letters");
    await Promise.all([setAutoSlotRaw("reading-confirm", "letter-a"), setAutoSlotRaw("reading-dayof", "letter-b")]);
    expect(await getAutoSlotLetter("reading-confirm")).toBe("letter-a");
    expect(await getAutoSlotLetter("reading-dayof")).toBe("letter-b");
  });

  it("fails CLOSED to null when the vault errors — never throws", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("simulated KV outage");
    });
    const { getAutoSlotLetter } = await import("@/lib/letters");
    await expect(getAutoSlotLetter("reading-confirm")).resolves.toBeNull();
  });
});

/* ═══════════════════ isComposedLetterKey — BLOCKER 1's gate ═══════════════ */

describe("isComposedLetterKey — a slot's only eligible set", () => {
  it("a seeded letter (order-receipt, welcome, etc.) is NOT composed", async () => {
    const { isComposedLetterKey } = await import("@/lib/letters");
    expect(await isComposedLetterKey("order-receipt")).toBe(false);
    expect(await isComposedLetterKey("welcome")).toBe(false);
    expect(await isComposedLetterKey("pwyc-accept")).toBe(false);
    expect(await isComposedLetterKey("offer-love-notify")).toBe(false);
  });

  it("a letter Love composes IS composed", async () => {
    const key = await composeLetter("Weekly Reading with Love #2");
    const { isComposedLetterKey } = await import("@/lib/letters");
    expect(await isComposedLetterKey(key)).toBe(true);
  });
});

/* ═══════════════════ effectiveAutoSlot — the one resolution ═══════════════ */

describe("effectiveAutoSlot (reading-letters.ts) — the three-way resolution", () => {
  it("no slot ever set resolves to the hardcoded default", async () => {
    const { effectiveAutoSlot, READING_CONFIRMATION_LETTER_KEY, READING_DAYOF_LETTER_KEY } = await import("@/lib/reading-letters");
    expect(await effectiveAutoSlot("reading-confirm")).toBe(READING_CONFIRMATION_LETTER_KEY);
    expect(await effectiveAutoSlot("reading-dayof")).toBe(READING_DAYOF_LETTER_KEY);
  });

  it("a composed key resolves to itself", async () => {
    const key = await composeLetter("Her Other Letter");
    const { setAutoSlotRaw } = await import("@/lib/letters");
    await setAutoSlotRaw("reading-confirm", key);
    const { effectiveAutoSlot } = await import("@/lib/reading-letters");
    expect(await effectiveAutoSlot("reading-confirm")).toBe(key);
  });

  it("the literal builtin resolves to builtin, never the default", async () => {
    const { setAutoSlotRaw, AUTO_SLOT_BUILTIN } = await import("@/lib/letters");
    await setAutoSlotRaw("reading-confirm", AUTO_SLOT_BUILTIN);
    const { effectiveAutoSlot, READING_CONFIRMATION_LETTER_KEY } = await import("@/lib/reading-letters");
    const effective = await effectiveAutoSlot("reading-confirm");
    expect(effective).toBe("builtin");
    expect(effective).not.toBe(READING_CONFIRMATION_LETTER_KEY);
  });

  it("BLOCKER 1: a slot naming a non-composed (stale/seeded) key is ignored and treated as unset", async () => {
    const { setAutoSlotRaw } = await import("@/lib/letters");
    // never created as a composed letter — a stale/deleted-letter shape, or
    // (defensively) a seeded key that slipped in before this fix existed
    await setAutoSlotRaw("reading-confirm", "order-receipt");
    const { effectiveAutoSlot, READING_CONFIRMATION_LETTER_KEY } = await import("@/lib/reading-letters");
    expect(await effectiveAutoSlot("reading-confirm")).toBe(READING_CONFIRMATION_LETTER_KEY);
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
  });

  it("rejects an unknown slot name", async () => {
    const key = await composeLetter("A Letter");
    const res = await (await slotsPUT())(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key, slot: "not-a-real-slot" }) }),
    );
    expect(res.status).toBe(400);
  });

  it("BLOCKER 1: rejects a SEEDED letter trying to ride a slot — 400, and nothing is written", async () => {
    const res = await (await slotsPUT())(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: "order-receipt", slot: "reading-confirm" }) }),
    );
    expect(res.status).toBe(400);
    const { getAutoSlotLetter } = await import("@/lib/letters");
    expect(await getAutoSlotLetter("reading-confirm")).toBeNull();
  });

  it("a composed letter can be assigned a slot; GET reflects it as the EFFECTIVE key", async () => {
    const key = await composeLetter("Her Own Letter");
    const putRes = await (await slotsPUT())(req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key, slot: "reading-dayof" }) }));
    expect(await putRes.json()).toEqual({ ok: true });

    const getRes = await (await slotsGET())(req("/api/admin/letters/slots"));
    const { READING_CONFIRMATION_LETTER_KEY } = await import("@/lib/reading-letters");
    expect(await getRes.json()).toEqual({ ok: true, slots: { "reading-confirm": READING_CONFIRMATION_LETTER_KEY, "reading-dayof": key } });
  });

  it("BLOCKER 2: GET shows the DEFAULT letter as the effective holder of its own slot, with no slot ever written", async () => {
    const { READING_CONFIRMATION_LETTER_KEY, READING_DAYOF_LETTER_KEY } = await import("@/lib/reading-letters");
    const getRes = await (await slotsGET())(req("/api/admin/letters/slots"));
    expect(await getRes.json()).toEqual({
      ok: true,
      slots: { "reading-confirm": READING_CONFIRMATION_LETTER_KEY, "reading-dayof": READING_DAYOF_LETTER_KEY },
    });
  });

  it("BLOCKER 2: choosing 'Not automatic' on the DEFAULT letter writes the literal builtin, never leaves it absent", async () => {
    const { READING_CONFIRMATION_LETTER_KEY } = await import("@/lib/reading-letters");
    await composeDefault(READING_CONFIRMATION_LETTER_KEY, "Weekly Reading with Love"); // production reality: it already IS a composed letter
    const res = await (await slotsPUT())(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: READING_CONFIRMATION_LETTER_KEY, slot: "" }) }),
    );
    expect(await res.json()).toEqual({ ok: true });

    const { getAutoSlotLetter } = await import("@/lib/letters");
    expect(await getAutoSlotLetter("reading-confirm")).toBe("builtin"); // explicit, not absent

    const getRes = await (await slotsGET())(req("/api/admin/letters/slots"));
    const body = (await getRes.json()) as { slots: Record<string, string> };
    expect(body.slots["reading-confirm"]).toBe("builtin");
    expect(body.slots["reading-confirm"]).not.toBe(READING_CONFIRMATION_LETTER_KEY); // never fell back to the same letter
  });

  it("moving a letter onto a DIFFERENT slot vacates the one it held (explicit builtin, not absent)", async () => {
    const key = await composeLetter("Roaming Letter");
    await (await slotsPUT())(req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key, slot: "reading-confirm" }) }));
    await (await slotsPUT())(req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key, slot: "reading-dayof" }) }));

    const { getAutoSlotLetter } = await import("@/lib/letters");
    expect(await getAutoSlotLetter("reading-confirm")).toBe("builtin");
    expect(await getAutoSlotLetter("reading-dayof")).toBe(key);
  });

  it("moving letter B onto a slot letter A held replaces A — A's own row would show 'Not automatic', B's shows the slot", async () => {
    const a = await composeLetter("Letter A");
    const b = await composeLetter("Letter B");
    await (await slotsPUT())(req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: a, slot: "reading-confirm" }) }));
    await (await slotsPUT())(req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: b, slot: "reading-confirm" }) }));

    const { getAutoSlotLetter } = await import("@/lib/letters");
    expect(await getAutoSlotLetter("reading-confirm")).toBe(b);
    const { effectiveAutoSlot } = await import("@/lib/reading-letters");
    expect(await effectiveAutoSlot("reading-confirm")).toBe(b);
  });
});

/* ═══════════ BLOCKER 2's own test: the default letter, turned off, sends the built-in words ═══════════ */

describe("BLOCKER 2 end to end — 'Not automatic' on the default letter results in the built-in words being sent", () => {
  beforeEach(() => {
    sent.length = 0;
    onceWithinClaims.clear();
  });

  it("the default letter shows its slot (GET) — with words saved, it sends HER subject", async () => {
    const { READING_CONFIRMATION_LETTER_KEY } = await import("@/lib/reading-letters");
    const { saveLetterOverride } = await import("@/lib/letters");
    await saveLetterOverride(READING_CONFIRMATION_LETTER_KEY, {
      subject: "You're in — the reading awaits",
      body: "Beautiful soul, you are on the list.",
      audience: "members",
    });

    const slotsGET = (await import("@/app/api/admin/letters/slots/route")).GET;
    const getRes = await slotsGET(req("/api/admin/letters/slots"));
    const body = (await getRes.json()) as { slots: Record<string, string> };
    expect(body.slots["reading-confirm"]).toBe(READING_CONFIRMATION_LETTER_KEY);

    const { buildReadingConfirmationLetter } = await import("@/lib/reading-letters");
    const mail = await buildReadingConfirmationLetter("reader@example.com");
    expect(mail.subject).toBe("You're in — the reading awaits");
  });

  it("'Not automatic' on the default letter (via the route) results in the built-in words being sent", async () => {
    const { READING_CONFIRMATION_LETTER_KEY } = await import("@/lib/reading-letters");
    await composeDefault(READING_CONFIRMATION_LETTER_KEY, "Weekly Reading with Love"); // production reality: it already IS a composed letter
    const { saveLetterOverride } = await import("@/lib/letters");
    await saveLetterOverride(READING_CONFIRMATION_LETTER_KEY, {
      subject: "You're in — the reading awaits",
      body: "Beautiful soul, you are on the list.",
      audience: "members",
    });

    const slotsPUT = (await import("@/app/api/admin/letters/slots/route")).PUT;
    const putRes = await slotsPUT(
      req("/api/admin/letters/slots", { method: "PUT", body: JSON.stringify({ key: READING_CONFIRMATION_LETTER_KEY, slot: "" }) }),
    );
    expect(await putRes.json()).toEqual({ ok: true });

    const { sendReadingConfirmation } = await import("@/lib/reading-letters");
    const result = await sendReadingConfirmation("reader@example.com");
    expect(result).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("You're on the list for the reading"); // the built-in words, not hers
  });
});
