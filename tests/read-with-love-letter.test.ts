import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * TASK-126 (0018.06.16 a₿): the Read with Love letter. A subscriber joining
 * through the second square (`source === "readwithlove"`) receives the
 * weekly-reading welcome — subject "Read with Love — your seat" — with the
 * Zoom line read from READ_WITH_LOVE_ZOOM_URL server-side only: unset, the
 * letter honestly says the link is coming (derive-or-dash, never a fake or
 * placeholder URL — the URL in this spec is a test fake and lives nowhere
 * else). The day-two welcome (about the meditation) is skipped for this
 * source. Every other source pours the meditation letter exactly as before.
 *
 * The mail rail and the drip queue are mocked — the spec pins the LETTER
 * (subject, Zoom line) and the ROUTE's branch, not SMTP.
 */

const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; html: string }>);
const enqueued = vi.hoisted(() => [] as Array<Array<{ subject: string }>>);

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
  enqueue: async (jobs: Array<{ subject: string }>) => {
    enqueued.push(jobs);
  },
}));

vi.mock("@/lib/subscribers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/subscribers")>();
  return {
    ...actual,
    subscribersConfigured: () => true,
    addSubscriber: async () => ({ added: true, already: false }),
  };
});

const FAKE_ZOOM = "https://zoom.example.invalid/j/00000000000";

const leadMagnet = () => import("@/lib/lead-magnet");
const route = () => import("@/app/api/subscribe/route");

function join(source: string) {
  return new Request("http://test/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "reader@example.com", source }),
  });
}

beforeEach(() => {
  sent.length = 0;
  enqueued.length = 0;
  delete process.env.READ_WITH_LOVE_ZOOM_URL;
});

afterEach(() => {
  delete process.env.READ_WITH_LOVE_ZOOM_URL;
});

describe("the Read with Love letter (TASK-126)", () => {
  it("carries the RWL subject and the honest 'coming' line when the env is unset", async () => {
    const { sendReadWithLoveLetter } = await leadMagnet();
    await sendReadWithLoveLetter("reader@example.com");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Read with Love — your seat");
    expect(sent[0].html).toContain("The Zoom link is coming");
    expect(sent[0].html).toContain("before the first reading.");
    expect(sent[0].html).not.toContain("Unzip Into the New You");
  });

  it("rides READ_WITH_LOVE_ZOOM_URL when set (a fake URL, the test's alone)", async () => {
    process.env.READ_WITH_LOVE_ZOOM_URL = FAKE_ZOOM;
    const { sendReadWithLoveLetter } = await leadMagnet();
    await sendReadWithLoveLetter("reader@example.com");
    expect(sent[0].html).toContain(`href="${FAKE_ZOOM}"`);
    expect(sent[0].html).not.toContain("The Zoom link is coming");
  });

  it("the meditation letter is unchanged for every other source", async () => {
    const { sendLeadMagnetLetter } = await leadMagnet();
    await sendLeadMagnetLetter("reader@example.com");
    expect(sent[0].subject).toBe("Your free meditation — Unzip Into the New You");
    expect(sent[0].html).toContain("Unzip Into the New You");
    expect(sent[0].html).not.toContain("Read with Love");
  });
});

describe("the subscribe route's source branch (TASK-126)", () => {
  it("readwithlove joins get the RWL letter and NO day-two welcome", async () => {
    const { POST } = await route();
    const res = await POST(join("readwithlove"));
    expect(res.status).toBe(200);
    expect(sent.map((m) => m.subject)).toEqual(["Read with Love — your seat"]);
    expect(enqueued).toHaveLength(0); // the day-two note is about the meditation
  });

  it("other sources keep the meditation letter AND the day-two welcome", async () => {
    const { POST } = await route();
    const res = await POST(join("footer"));
    expect(res.status).toBe(200);
    expect(sent.map((m) => m.subject)).toEqual(["Your free meditation — Unzip Into the New You"]);
    expect(enqueued).toHaveLength(1);
  });
});
