import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { OutgoingMail } from "@/lib/mail";

/**
 * TASK-482 HOTFIX — the automated reading letters read Love's own two
 * composed letters FIRST: `weekly-reading-with-love` for the sign-up
 * confirmation, `weekly-reading-with-love-2` for the 2 a.m. day-of letter
 * (the two live /a/letters keys, confirmed from the production list,
 * block 968,624 — named constants in `reading-letters.ts`, never
 * re-derived). The built-in words are the fallback ONLY when that letter
 * has no override saved, its saved body is blank, or the vault errors.
 *
 * `@/lib/letters` runs FOR REAL here, against an in-memory KV REST stub
 * (`tests/letters-send.test.ts`'s own idiom), so `getLetterOverride` is
 * exercised end to end rather than mocked away. `@/lib/mail` and
 * `@/lib/subscribers` are mocked exactly as `tests/reading-letters.test.ts`
 * mocks them, so only the LETTER CHOICE is under test here — never SMTP,
 * never the subscriber vault's own send-time guards (already pinned
 * there).
 */

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
    onceWithin: async (key: string) => {
      if (onceWithinClaims.has(key)) return false;
      onceWithinClaims.add(key);
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

const vault = new Map<string, string>();

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

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://reading-test.example";
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
});

beforeEach(() => {
  vault.clear();
  sent.length = 0;
  onceWithinClaims.clear();
  stubKv();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const lib = () => import("@/lib/reading-letters");
const lettersLib = () => import("@/lib/letters");

const STARTS_AT_MS = Date.parse("2026-09-23T19:11:00.000Z"); // any future instant relative to "now" fixtures below

describe("buildReadingConfirmationLetter — the weekly-reading-with-love key", () => {
  it("the exported key is exactly the production slug", async () => {
    const { READING_CONFIRMATION_LETTER_KEY } = await lib();
    expect(READING_CONFIRMATION_LETTER_KEY).toBe("weekly-reading-with-love");
  });

  it("sends Love's own subject and body, rendered through letterHtml, when the letter has words", async () => {
    const { saveLetterOverride } = await lettersLib();
    await saveLetterOverride("weekly-reading-with-love", {
      subject: "You're in — the reading awaits",
      body: "Beautiful soul, you are on the list. With love, Love.",
      audience: "members",
    });
    const { buildReadingConfirmationLetter } = await lib();
    const mail = await buildReadingConfirmationLetter("reader@example.com");
    expect(mail.subject).toBe("You're in — the reading awaits");
    expect(mail.html).toContain("Beautiful soul, you are on the list. With love, Love.");
    expect(mail.html).not.toContain("You're on the list for the reading");
    expect(mail.unsubscribeUrl).toBeTruthy();
    expect(mail.html).toContain(mail.unsubscribeUrl!);
  });

  it("falls back to the built-in words when no override has ever been saved", async () => {
    const { buildReadingConfirmationLetter } = await lib();
    const mail = await buildReadingConfirmationLetter("reader@example.com");
    expect(mail.subject).toBe("You're on the list for the reading");
  });

  it("falls back to the built-in words when the saved override's body is blank", async () => {
    const { saveLetterOverride } = await lettersLib();
    await saveLetterOverride("weekly-reading-with-love", { subject: "Anything", body: "   \n\n  ", audience: "members" });
    const { buildReadingConfirmationLetter } = await lib();
    const mail = await buildReadingConfirmationLetter("reader@example.com");
    expect(mail.subject).toBe("You're on the list for the reading");
  });

  it("falls back to the built-in words when the vault errors", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("simulated KV outage");
    });
    const { buildReadingConfirmationLetter } = await lib();
    const mail = await buildReadingConfirmationLetter("reader@example.com");
    expect(mail.subject).toBe("You're on the list for the reading");
  });
});

describe("buildReadingDayOfLetter — the weekly-reading-with-love-2 key", () => {
  it("the exported key is exactly the production slug", async () => {
    const { READING_DAYOF_LETTER_KEY } = await lib();
    expect(READING_DAYOF_LETTER_KEY).toBe("weekly-reading-with-love-2");
  });

  it("sends Love's own subject and body, rendered through letterHtml, when the letter has words", async () => {
    const { saveLetterOverride } = await lettersLib();
    await saveLetterOverride("weekly-reading-with-love-2", {
      subject: "Tonight's the night",
      body: "The reading begins soon, beloved.",
      audience: "members",
    });
    const { buildReadingDayOfLetter } = await lib();
    const mail = await buildReadingDayOfLetter("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(mail.subject).toBe("Tonight's the night");
    expect(mail.html).toContain("The reading begins soon, beloved.");
    expect(mail.html).not.toContain("Don't forget");
    expect(mail.unsubscribeUrl).toBeTruthy();
    expect(mail.html).toContain(mail.unsubscribeUrl!);
  });

  it("falls back to the built-in words when no override has ever been saved", async () => {
    const { buildReadingDayOfLetter } = await lib();
    const mail = await buildReadingDayOfLetter("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(mail.subject).toBe("Don't forget — the reading is today");
  });

  it("falls back to the built-in words when the saved override's body is blank", async () => {
    const { saveLetterOverride } = await lettersLib();
    await saveLetterOverride("weekly-reading-with-love-2", { subject: "Anything", body: "\n \n", audience: "members" });
    const { buildReadingDayOfLetter } = await lib();
    const mail = await buildReadingDayOfLetter("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(mail.subject).toBe("Don't forget — the reading is today");
  });

  it("falls back to the built-in words when the vault errors", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("simulated KV outage");
    });
    const { buildReadingDayOfLetter } = await lib();
    const mail = await buildReadingDayOfLetter("reader@example.com", STARTS_AT_MS, "America/Denver");
    expect(mail.subject).toBe("Don't forget — the reading is today");
  });
});

describe("the real send paths route through the composed-letter builders, guards untouched", () => {
  it("sendReadingConfirmation sends her words when the letter has them", async () => {
    const { saveLetterOverride } = await lettersLib();
    await saveLetterOverride("weekly-reading-with-love", {
      subject: "You're in",
      body: "Welcome, truly.",
      audience: "members",
    });
    const { sendReadingConfirmation } = await lib();
    const result = await sendReadingConfirmation("reader@example.com");
    expect(result).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("You're in");
  });

  it("sendReadingConfirmation still falls back to the built-in words with no letter saved", async () => {
    const { sendReadingConfirmation } = await lib();
    const result = await sendReadingConfirmation("reader@example.com");
    expect(result).toBe("sent");
    expect(sent[0].subject).toBe("You're on the list for the reading");
  });

  it("sendReadingDayOf sends her words when the letter has them, still honoring the late guard", async () => {
    const { saveLetterOverride } = await lettersLib();
    await saveLetterOverride("weekly-reading-with-love-2", {
      subject: "Tonight",
      body: "See you soon.",
      audience: "members",
    });
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    const { sendReadingDayOf } = await lib();
    const result = await sendReadingDayOf("reader@example.com", now + 3600_000, "America/Denver");
    expect(result).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Tonight");

    // the late guard is unchanged: once the reading has begun, nothing sends
    sent.length = 0;
    onceWithinClaims.clear();
    const late = await sendReadingDayOf("reader@example.com", now, "America/Denver");
    expect(late).toBe("skippedLate");
    expect(sent).toHaveLength(0);
  });
});
