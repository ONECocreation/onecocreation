import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { toggleMark, insertLink, insertAtCaret } from "@/lib/letter-marks";
import { bodyToHtml, letterHtml } from "@/lib/letters";

/**
 * TASK-214 — the letters desk, seen broken live on the call: the
 * bold/italic toolbar did nothing, no preview panel existed, the delivered
 * email wore the old white shell, and the send panel fired the receipt 3×
 * on 3 clicks. Root causes (Ms. Kimi's reads, stood at hand-off) pinned
 * here:
 *  1. the toolbar's pure mark helpers (letter-marks.ts) — wrap/unwrap the
 *     SELECTION, never append to the end
 *  2. paste + emoji survive letterHtml/bodyToHtml end to end (including a
 *     pasted Windows line ending, which used to leave a stray \r)
 *  3. the NEW preview route renders the exact same html the send route
 *     would fire — no client-side approximation
 *  4. the send route's own onceWithin() guard: the SAME request fired 3×
 *     rapidly enqueues exactly once
 */

/* ── item 1: the toolbar's pure mark helpers ─────────────────────────────── */

describe("letter-marks: the toolbar's pure selection helpers", () => {
  it("wraps a selection in a symmetric mark (bold)", () => {
    const r = toggleMark({ text: "hello world", start: 6, end: 11 }, "**");
    expect(r.text).toBe("hello **world**");
    expect(r.text.slice(r.start, r.end)).toBe("world");
  });

  it("toggles the SAME mark back off when the selection already sits inside it", () => {
    const wrapped = toggleMark({ text: "hello world", start: 6, end: 11 }, "**");
    const unwrapped = toggleMark({ text: wrapped.text, start: wrapped.start, end: wrapped.end }, "**");
    expect(unwrapped.text).toBe("hello world");
    expect(unwrapped.text.slice(unwrapped.start, unwrapped.end)).toBe("world");
  });

  it("strips the mark when the selection itself carries the mark at its own edges", () => {
    const r = toggleMark({ text: "hello **world** today", start: 6, end: 15 }, "**");
    expect(r.text).toBe("hello world today");
  });

  it("an empty selection (a bare caret) inserts a placeholder, ready to type over", () => {
    const r = toggleMark({ text: "hello ", start: 6, end: 6 }, "*");
    expect(r.text).toBe("hello *text*");
    expect(r.text.slice(r.start, r.end)).toBe("text");
  });

  it("italic and bold are independent marks — one never eats the other's asterisks", () => {
    const bold = toggleMark({ text: "hi", start: 0, end: 2 }, "**");
    expect(bold.text).toBe("**hi**");
    const italic = toggleMark({ text: bold.text, start: bold.start, end: bold.end }, "*");
    expect(italic.text).toBe("***hi***");
  });

  it("insertLink() wraps the selection as the label and selects the URL for typing over", () => {
    const r = insertLink({ text: "click here please", start: 6, end: 10 }, "https://");
    expect(r.text).toBe("click [here](https://) please");
    expect(r.text.slice(r.start, r.end)).toBe("https://");
  });

  it("insertLink() with no selection uses a placeholder label", () => {
    const r = insertLink({ text: "", start: 0, end: 0 });
    expect(r.text).toBe("[link text](https://)");
  });

  it("insertAtCaret() replaces the selection and lands the caret after (image upload, emoji)", () => {
    const r = insertAtCaret({ text: "before  after", start: 7, end: 7 }, "💛");
    expect(r.text).toBe("before 💛 after");
    expect(r.start).toBe(r.end);
  });
});

/* ── item 2: paste + emoji survive end to end ────────────────────────────── */

describe("paste + emoji ride letterHtml/bodyToHtml end to end", () => {
  it("straight paste keeps its paragraph breaks — no markup soup", () => {
    const html = bodyToHtml("First paragraph, typed.\n\nSecond paragraph, pasted from elsewhere.");
    expect(html).toContain("<p style=\"margin:0 0 1.15em;line-height:1.75;\">First paragraph, typed.</p>");
    expect(html).toContain("Second paragraph, pasted from elsewhere.</p>");
    expect(html.match(/<p /g)).toHaveLength(2);
  });

  it("a single line break inside a paragraph becomes <br/>, not a new paragraph", () => {
    const html = bodyToHtml("line one\nline two");
    expect(html).toContain("line one<br/>line two");
  });

  it("emoji pass through untouched — typed or pasted, they are not markup", () => {
    const html = bodyToHtml("Beautiful soul 💛🦋🌈 — welcome.");
    expect(html).toContain("Beautiful soul 💛🦋🌈 — welcome.");
  });

  it("a pasted Windows line ending (\\r\\n) still keeps exactly the breaks shown on screen", () => {
    const html = bodyToHtml("para one\r\n\r\npara two, line a\r\nline b");
    expect(html).not.toContain("\r");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).toContain("line a<br/>line b");
  });

  it("bold, italic, a link, and emoji all survive together into one paragraph", () => {
    const html = bodyToHtml("**bold** and *italic* and a [door](https://example.com/x) 💛");
    expect(html).toContain("<b>bold</b>");
    expect(html).toContain("<i>italic</i>");
    expect(html).toContain('<a href="https://example.com/x" style="color:#E7B2C3">door</a>');
    expect(html).toContain("💛");
  });

  it("letterHtml() (the plain shell, no directives) carries the same paragraph + emoji through", () => {
    const html = letterHtml("Hello 💛\n\nSecond line.");
    expect(html).toContain("Hello 💛");
    expect(html).toContain("Second line.");
    expect(html).toContain("background:#141021");
  });
});

/* ── item 3: the preview route — same render the send route would fire ──── */

describe("the preview route (NEW, TASK-214)", () => {
  let cookie: string;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://test-site.example";
    process.env.SEAT_SECRET = "test-seat-secret";
    const pk = getPublicKey(generateSecretKey());
    process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
    const { makeOperatorToken } = await import("@/lib/operator-auth");
    cookie = `fe-operator=${makeOperatorToken(pk)}`;
  });

  const req = (body: unknown, withCookie = true) =>
    new Request("http://localhost/api/admin/letters/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(withCookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    });

  it("refuses an unauthenticated request", async () => {
    const { POST } = await import("@/app/api/admin/letters/preview/route");
    const res = await POST(req({ body: "hello" }, false));
    expect(res.status).toBe(401);
  });

  it("renders the SAME letterHtml() the send route would fire — dark shell, live content", async () => {
    const { POST } = await import("@/app/api/admin/letters/preview/route");
    const res = await POST(req({ body: "**Welcome** 💛\n\nSecond paragraph." }));
    const d = await res.json();
    expect(d.ok).toBe(true);
    expect(d.html).toContain("<b>Welcome</b>");
    expect(d.html).toContain("💛");
    expect(d.html).toContain("Second paragraph.");
    expect(d.html).toContain("background:#141021"); // the dark ground, not the old white shell
    expect(d.html).not.toContain("onecocreation-mark.svg"); // the OLD bare mark
  });

  it("400s a missing body — never renders an empty shell silently", async () => {
    const { POST } = await import("@/app/api/admin/letters/preview/route");
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });
});

/* ── item 4: one send per click, proven at the route ─────────────────────── */

describe("one send per click — the send route's onceWithin() guard (TASK-214)", () => {
  const strings = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const expiring = new Map<string, number>(); // key -> epoch ms it disappears

  function vaultReset() {
    strings.clear();
    lists.clear();
    expiring.clear();
  }

  function liveGet(k: string): string | null {
    const until = expiring.get(k);
    if (until !== undefined && Date.now() >= until) {
      strings.delete(k);
      expiring.delete(k);
      return null;
    }
    return strings.get(k) ?? null;
  }

  /** A real (if tiny) NX/PX implementation — the fake in tests/letters-send.test.ts
   *  always returns "OK", which would make this suite prove nothing. */
  function vaultCmd(cmd: unknown[]): unknown {
    const [op, k, ...rest] = cmd as [string, string, ...string[]];
    switch (op) {
      case "GET":
        return liveGet(k);
      case "SET": {
        const nxIdx = rest.indexOf("NX");
        const pxIdx = rest.indexOf("PX");
        if (nxIdx !== -1 && liveGet(k) !== null) return null; // already held
        strings.set(k, rest[0]);
        if (pxIdx !== -1) expiring.set(k, Date.now() + Number(rest[pxIdx + 1]));
        else expiring.delete(k);
        return "OK";
      }
      case "DEL":
        strings.delete(k);
        expiring.delete(k);
        return 1;
      case "SADD":
      case "SREM":
        return 1;
      case "SMEMBERS":
        return [];
      case "LPUSH": {
        const l = lists.get(k) ?? [];
        l.unshift(...rest);
        lists.set(k, l);
        return l.length;
      }
      case "LRANGE": {
        const l = lists.get(k) ?? [];
        return l.slice(Number(rest[0]), Number(rest[1]) + 1);
      }
      case "LTRIM":
      case "EXPIRE":
      case "INCR":
        return 1;
      default:
        return null;
    }
  }

  const sentMail: { to: string; subject: string }[] = [];
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

  beforeAll(async () => {
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "test-token";
    process.env.NEXT_PUBLIC_SITE_URL = "https://test-site.example";
    process.env.SEAT_SECRET = "test-seat-secret";
    process.env.SMTP_HOST = "smtp.example";
    process.env.SMTP_USER_NEWS = "news@example";
    process.env.SMTP_PASS_NEWS = "test";
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

  const req = () =>
    new Request("http://localhost/api/admin/letters/send", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ key: "lead-magnet", testTo: "love@example.com" }),
    });

  it("three near-simultaneous clicks (the SAME request) enqueue exactly one test copy", async () => {
    const { POST } = await import("@/app/api/admin/letters/send/route");
    const results = await Promise.all([POST(req()), POST(req()), POST(req())]);
    const bodies = await Promise.all(results.map((r) => r.json()));
    const okCount = bodies.filter((b) => b.ok).length;
    expect(okCount).toBe(1);
    expect(bodies.filter((b) => !b.ok && b.reason?.includes("already sending"))).toHaveLength(2);
  });

  it("this is a click guard, not a permanent lock — a fresh key past its own window opens again", async () => {
    const { onceWithin } = await import("@/lib/mail");
    expect(await onceWithin("probe-a", 20)).toBe(true); // first call always wins
    expect(await onceWithin("probe-a", 20)).toBe(false); // the SAME key, still inside the window
    await new Promise((r) => setTimeout(r, 40));
    expect(await onceWithin("probe-a", 20)).toBe(true); // the window passed — a real resend is never stuck
  });
});
