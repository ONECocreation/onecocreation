import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

/**
 * TASK-304 (0018.06.26 a₿) — "Send to user": the studio's guest-door invite
 * letter to ONE member. The KV rail is the same in-memory stub letters-send
 * uses (extended so SET NX is honored — the double-send guard must be
 * exercised for real); nodemailer is mocked at the seam; the route handler
 * runs for real behind a real operator cookie.
 *
 * Truth pinned: the letter's HTML carries the guest door (/meet/studio/<room>)
 * and never director/muteallguests/password parameters · the route 401s with
 * no operator cookie · an array or list-shaped body is refused 400, never
 * partially sent · a send lands one mail + one mailbox entry ("studio-invite")
 * · a second send inside the guard window is refused 409 with no second mail ·
 * the chooser's source narrows the People list to kind === "email".
 */

/* ── the in-memory vault ─────────────────────────────────────────────────── */

const strings = new Map<string, string>();
const lists = new Map<string, string[]>();

function vaultReset() {
  strings.clear();
  lists.clear();
}

function vaultCmd(cmd: [string, ...string[]]): unknown {
  const [op, k, ...rest] = cmd;
  switch (op) {
    case "GET":
      return strings.get(k) ?? null;
    case "SET": {
      // SET key val NX PX <ms> — the onceWithin guard's shape: refuse when taken
      if (rest.includes("NX") && strings.has(k)) return null;
      strings.set(k, rest[0]);
      return "OK";
    }
    case "LPUSH": {
      const l = lists.get(k) ?? [];
      l.unshift(...rest);
      lists.set(k, l);
      return l.length;
    }
    case "LTRIM": {
      const l = lists.get(k) ?? [];
      lists.set(k, l.slice(Number(rest[0]), Number(rest[1]) + 1));
      return "OK";
    }
    case "LRANGE": {
      const l = lists.get(k) ?? [];
      return l.slice(Number(rest[0]), Number(rest[1]) + 1);
    }
    case "INCR": {
      const n = Number(strings.get(k) ?? 0) + 1;
      strings.set(k, String(n));
      return n;
    }
    default:
      return null;
  }
}

/* ── nodemailer mocked at the seam — captures what sendMail hands over ───── */

const sentMail: { to: string; subject: string; html: string }[] = [];
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (args: (typeof sentMail)[number]) => {
        sentMail.push(args);
      },
    }),
  },
}));

let cookie: string;

const invitePOST = async () => (await import("@/app/api/admin/studio/invite/route")).POST;

const req = (body: unknown, withCookie = true) =>
  new Request("http://localhost/api/admin/studio/invite", {
    method: "POST",
    headers: {
      ...(withCookie ? { cookie } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.SEAT_SECRET = "test-seat-secret";
  // the bookings persona "configured" — nodemailer above is a mock, nothing connects
  process.env.SMTP_HOST = "smtp.example";
  process.env.SMTP_USER_BOOKINGS = "bookings@example";
  process.env.SMTP_PASS_BOOKINGS = "test";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  vi.stubGlobal("fetch", async (_url: unknown, init?: { body?: string }) =>
    Response.json({ result: vaultCmd(JSON.parse(init?.body ?? "[]")) }),
  );
});

beforeEach(() => {
  vaultReset();
  sentMail.length = 0;
});

describe("the letter's mint — studioInviteHtml", () => {
  it("carries the SIGNED guest door and never a director/key/password parameter", async () => {
    const { studioInviteHtml } = await import("@/lib/mail-studio-invite");
    const { meetStudioUrl } = await import("@/lib/live-links");
    const { withStudioInvite, verifyStudioInvite } = await import("@/lib/studio/invite-token");
    /* TASK-440: the door is signed — a 7-day `?invite=` token rides the
       SITE url (never the room key), and it verifies against the room. */
    const joinUrl = withStudioInvite(meetStudioUrl("https://site.example", "onecocreation_studio"), "onecocreation_studio")!;
    expect(joinUrl).toMatch(/^https:\/\/site\.example\/meet\/studio\/onecocreation_studio\?invite=\d+\.[a-f0-9]{64}$/);
    expect(verifyStudioInvite("onecocreation_studio", joinUrl.split("?invite=")[1])).toBe(true);
    const html = studioInviteHtml({
      to: "ana@example.com",
      roomTitle: "Heart Field · the studio",
      joinUrl,
      startsAt: "2026-09-20T15:00:00.000Z",
    });
    expect(html).toContain("https://site.example/meet/studio/onecocreation_studio?invite=");
    expect(html).toContain("Heart Field · the studio");
    expect(html).toContain("When:"); // startsAt set → the time row rides
    expect(html).not.toContain("director=");
    expect(html).not.toContain("muteallguests");
    expect(html).not.toContain("password=");
    expect(html).not.toContain("&key=");
  });

  it("no startsAt → the letter carries no time at all (derive-or-dash)", async () => {
    const { studioInviteHtml } = await import("@/lib/mail-studio-invite");
    const html = studioInviteHtml({ to: "ana@example.com", joinUrl: "https://site.example/meet/studio/x" });
    expect(html).not.toContain("When:");
    expect(html).toContain("the studio"); // the generic fallback, never an invented name
  });
});

describe("POST /api/admin/studio/invite", () => {
  it("401s with no operator cookie", async () => {
    const res = await (await invitePOST())(req({ email: "ana@example.com" }, false));
    expect(res.status).toBe(401);
    expect(sentMail).toHaveLength(0);
  });

  it("refuses an array body outright — no bulk, ever", async () => {
    const res = await (await invitePOST())(req(["ana@example.com", "ben@example.com"]));
    expect(res.status).toBe(400);
    const d = await res.json();
    expect(d.ok).toBe(false);
    expect(sentMail).toHaveLength(0);
    expect(lists.get("mailbox:ana@example.com") ?? []).toHaveLength(0);
  });

  it("refuses a list-shaped email field the same way", async () => {
    const res = await (await invitePOST())(req({ email: ["ana@example.com", "ben@example.com"] }));
    expect(res.status).toBe(400);
    expect(sentMail).toHaveLength(0);
  });

  it("sends ONE member the guest-door letter and records her mailbox line", async () => {
    const res = await (await invitePOST())(req({ email: "ana@example.com", roomTitle: "Heart Field · the studio" }));
    const d = await res.json();
    expect(res.status).toBe(200);
    expect(d).toEqual({ ok: true });

    expect(sentMail).toHaveLength(1);
    expect(sentMail[0].to).toBe("ana@example.com");
    expect(sentMail[0].subject).toContain("Heart Field · the studio");
    // the server derived the door itself — the request body's origin, the guest path
    expect(sentMail[0].html).toContain("http://localhost/meet/studio/");
    expect(sentMail[0].html).not.toContain("director=");
    expect(sentMail[0].html).not.toContain("password=");

    const box = (lists.get("mailbox:ana@example.com") ?? []).map((r) => JSON.parse(r));
    expect(box).toHaveLength(1);
    expect(box[0]).toMatchObject({ key: "studio-invite", subject: sentMail[0].subject });
  });

  it("a second send inside the guard window is refused (409), no second mail", async () => {
    const POST = await invitePOST();
    const first = await POST(req({ email: "ana@example.com" }));
    expect(first.status).toBe(200);
    const res = await POST(req({ email: "ana@example.com" }));
    expect(res.status).toBe(409);
    const d = await res.json();
    expect(d.ok).toBe(false);
    expect(d.code).toBe("duplicate");
    expect(sentMail).toHaveLength(1); // the guard held — nothing re-mailed
  });
});

describe("the chooser — SendToUserChooser.tsx", () => {
  it("narrows the People list to email-space souls only (source pin)", () => {
    const src = readFileSync("src/components/studio-overlay/SendToUserChooser.tsx", "utf8");
    expect(src).toContain('p.kind === "email"');
    expect(src).toContain("/api/admin/people");
    expect(src).toContain("/api/admin/studio/invite");
  });

  it("StudioRoom mounts the chooser where the stub sat (source pin)", () => {
    const src = readFileSync("src/components/studio-overlay/StudioRoom.tsx", "utf8");
    expect(src).toContain("<SendToUserChooser");
    expect(src).not.toContain("coming with T-304");
  });
});
