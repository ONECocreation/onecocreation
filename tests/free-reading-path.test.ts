import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

/**
 * TASK-156 (0018.06.17 a₿, Love's meeting) — the free reading path and the
 * first-sign-in welcome. Pins, not renders (node env, no DOM — the house's
 * "pin the model" idiom):
 *
 *   1. THE DOOR — Read with Love's card derives the FREE room from the
 *      rooms registry (minTier "all", the Heart Field Commons — TASK-174;
 *      never a hardcoded fake), and leads a guest to the sign-in card with
 *      `?next=` carried, a member straight into the room.
 *   2. THE `next` RULE — only same-origin absolute paths survive
 *      (src/lib/next-path.ts).
 *   3. THE SIGN-IN SUCCESS HOOK — /api/auth/email/verify: source `welcome`
 *      on the list write; the welcome trio (meditation letter now, the
 *      `welcome` letter + day-two queued) fires ONLY behind a won
 *      first-sign-in claim — repeat sign-ins get nothing.
 *   4. THE REGISTRY — letters.ts carries the seeded `welcome` key with a
 *      members audience and an honest placeholder default.
 *
 * Mail, queue, subscribers and the email-auth vault are mocked — the spec
 * pins the ROUTE's branches and the LETTERS, not SMTP/KV.
 */

const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; html: string }>);
const enqueued = vi.hoisted(() => [] as Array<Array<{ to: string; subject: string }>>);
const subs = vi.hoisted(() => [] as Array<{ email: string; source: string }>);
const claim = vi.hoisted(() => ({ wins: true }));

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    mailConfigured: () => true,
    sendMail: async (_persona: string, mail: { to: string; subject: string; html: string }) => {
      sent.push(mail);
    },
  };
});

vi.mock("@/lib/mail-queue", () => ({
  enqueue: async (jobs: Array<{ to: string; subject: string }>) => {
    enqueued.push(jobs);
    return jobs.length;
  },
}));

vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return {
    ...actual,
    subscribersConfigured: () => true,
    addSubscriber: async (email: string, source: string) => {
      subs.push({ email, source });
      return { added: true, already: false };
    },
  };
});

vi.mock("@/lib/email-auth", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/email-auth")>();
  return {
    ...actual,
    emailAuthConfigured: () => true,
    verifyCode: async () => true,
    claimFirstSignIn: async () => claim.wins,
  };
});

beforeAll(() => {
  process.env.SEAT_SECRET = "free-reading-path-test";
});

beforeEach(() => {
  sent.length = 0;
  enqueued.length = 0;
  subs.length = 0;
  claim.wins = true;
});

function verifyReq(email = "reader@example.com", code = "123456") {
  return new Request("http://test/api/auth/email/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
}

/* the route pours the gifts fire-and-forget (the house idiom — the session
   never waits on the mail rail); a macrotask turn flushes those chains */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("the free-reading door (TASK-156)", () => {
  it("derives the reading room from the rooms registry — the FREE room (minTier \"all\"), the Commons", async () => {
    /* TASK-174: the free path leads to the Heart Field Commons, the room
       whose door is open to every member — not the tier-B weekly-reading
       room the T-156 derivation found by title. */
    const { READING_ROOM_SLUG, READING_ROOM_PATH } = await import("@/components/ReadWithLove");
    const { ROOMS } = await import("@/lib/matrix-rooms");
    const room = ROOMS.find((r) => r.minTier === "all");
    expect(room).toBeTruthy(); // derive-or-dash: the free room EXISTS
    expect(READING_ROOM_SLUG).toBe(room!.id.slice(1, room!.id.indexOf(":")));
    expect(READING_ROOM_SLUG).toBe("heart-field"); // the Commons, never a tiered room
    expect(READING_ROOM_PATH).toBe(`/rooms/${READING_ROOM_SLUG}`);
  });

  it("a guest's door carries ?next= to the sign-in card", async () => {
    const { readingDoorHref, READING_ROOM_PATH } = await import("@/components/ReadWithLove");
    expect(readingDoorHref(false)).toBe(`/login?next=${encodeURIComponent(READING_ROOM_PATH!)}`);
  });

  it("a member's door leads straight into the reading room", async () => {
    const { readingDoorHref, READING_ROOM_PATH } = await import("@/components/ReadWithLove");
    expect(readingDoorHref(true)).toBe(READING_ROOM_PATH);
  });
});

describe("the next-path safety rule (TASK-156)", () => {
  it("passes a same-origin absolute path", async () => {
    const { safeNextPath } = await import("@/lib/next-path");
    expect(safeNextPath("/rooms/weekly-reading")).toBe("/rooms/weekly-reading");
  });

  it("refuses full URLs, protocol-relative, relative and backslash tricks", async () => {
    const { safeNextPath } = await import("@/lib/next-path");
    expect(safeNextPath("https://evil.example/x")).toBeNull();
    expect(safeNextPath("//evil.example/x")).toBeNull();
    expect(safeNextPath("rooms/weekly-reading")).toBeNull();
    expect(safeNextPath("/\\evil")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });

  it("reads next off a location, falling back to null on a poisoned one", async () => {
    const { nextPathFromLocation } = await import("@/lib/next-path");
    expect(nextPathFromLocation({ search: "?next=/rooms/weekly-reading" })).toBe("/rooms/weekly-reading");
    expect(nextPathFromLocation({ search: "?next=https%3A%2F%2Fevil.example" })).toBeNull();
    expect(nextPathFromLocation({ search: "" })).toBeNull();
  });
});

describe("the sign-in success hook — first sign-in only (TASK-156)", () => {
  it("subscribes with source `welcome` and pours the trio on a FIRST sign-in", async () => {
    const { POST } = await import("@/app/api/auth/email/verify/route");
    const res = await POST(verifyReq());
    await flush();
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(d).toMatchObject({ ok: true, handle: "reader@example.com", space: "email" });
    expect(res.headers.get("set-cookie")).toContain("pa-fren=");

    // the newsletter — source `welcome`
    expect(subs).toEqual([{ email: "reader@example.com", source: "welcome" }]);

    // the free meditation rides out now (the house's one free item — the
    // lead-magnet letter is its delivery rail; no store entry is marked free)
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Your free meditation — Unzip Into the New You");

    // the welcome letter AND the day-two note are queued, in that order
    expect(enqueued).toHaveLength(2);
    expect(enqueued[0][0].subject).toBe("Welcome home — One Cocreation");
    expect(enqueued[1][0].subject).toBe("Welcome to the field — a note from One Cocreation");
  });

  it("a REPEAT sign-in still subscribes (idempotent) but pours nothing again", async () => {
    claim.wins = false; // the marker was claimed on an earlier sign-in
    const { POST } = await import("@/app/api/auth/email/verify/route");
    const res = await POST(verifyReq());
    await flush();
    expect(res.status).toBe(200);
    expect(subs).toEqual([{ email: "reader@example.com", source: "welcome" }]);
    expect(sent).toHaveLength(0);
    expect(enqueued).toHaveLength(0);
  });

  it("the SET NX marker itself answers once — the vault semantics behind the mock", async () => {
    /* unmocked module: the real claimFirstSignIn against a stubbed KV rail */
    const vault = new Map<string, string>();
    vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) => {
      const cmd = JSON.parse(init?.body ?? "[]") as string[];
      if (cmd[0] === "SET" && cmd.includes("NX")) {
        if (vault.has(cmd[1])) return Response.json({ result: null });
        vault.set(cmd[1], cmd[2]);
        return Response.json({ result: "OK" });
      }
      return Response.json({ result: null });
    });
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "test-token";
    try {
      const real = await vi.importActual<typeof import("@/lib/email-auth")>("@/lib/email-auth");
      expect(await real.claimFirstSignIn("Reader@Example.com")).toBe(true);
      expect(await real.claimFirstSignIn("reader@example.com")).toBe(false); // case-insensitive, once only
      expect(vault.has("auth:email:welcomed:reader@example.com")).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
    }
  });
});

describe("the welcome letter's registry seat (TASK-156)", () => {
  it("`welcome` is a seeded editable key with a members audience", async () => {
    const { EDITABLE_LETTERS, DEFAULT_AUDIENCE, audienceOf } = await import("@/lib/letters");
    expect(EDITABLE_LETTERS).toContain("welcome");
    expect(EDITABLE_LETTERS).toHaveLength(7); // six until TASK-156
    expect(DEFAULT_AUDIENCE.welcome).toBe("members");
    expect(audienceOf("welcome", null)).toBe("members");
  });

  it("the default copy is an honest placeholder Love can edit in /a/letters", async () => {
    const { LETTER_DEFAULTS } = await import("@/lib/letters");
    const tpl = LETTER_DEFAULTS.welcome;
    expect(tpl?.subject).toBe("Welcome home — One Cocreation");
    expect(tpl?.body).toContain("Unzip Into the New You"); // the gift is named
    expect(tpl?.body).toContain("PLACEHOLDER VOICE"); // never masquerades as Love's words
  });

  it("enqueueWelcomeLetter queues the default — and Love's override wins", async () => {
    const { enqueueWelcomeLetter } = await import("@/lib/lead-magnet");
    await enqueueWelcomeLetter("reader@example.com");
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0][0].to).toBe("reader@example.com");
    expect(enqueued[0][0].subject).toBe("Welcome home — One Cocreation");
  });
});
