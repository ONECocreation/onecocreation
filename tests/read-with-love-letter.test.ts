import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * TASK-126 (0018.06.16 a₿) + TASK-132 (0018.06.17 a₿): the Read with Love
 * letter. A subscriber joining through the second square
 * (`source === "readwithlove"`) receives the weekly-reading welcome —
 * subject "Read with Love — your seat". TASK-132: Zoom leaves Love's words;
 * the room line is built from the site's meeting config
 * (getSiteConfig().meeting, T-129 — mocked here per test so the pin is the
 * LETTER, not the fs/KV drivers): jitsi → https://<jitsiDomain>/
 * read-with-love with no "Zoom" anywhere; vdo → the VDO.Ninja guest link
 * for that room; neither → the honest "coming" line (derive-or-dash, never
 * a fake or placeholder URL — the URLs in this spec are test fakes and live
 * nowhere else). The optional override env READ_WITH_LOVE_ROOM_URL (renamed
 * from READ_WITH_LOVE_ZOOM_URL) wins when set, server-side only. The
 * day-two welcome (about the meditation) is skipped for this source. Every
 * other source pours the meditation letter exactly as before.
 *
 * The mail rail and the drip queue are mocked — the spec pins the LETTER
 * (subject, room line) and the ROUTE's branch, not SMTP.
 */

const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; html: string }>);
const enqueued = vi.hoisted(() => [] as Array<Array<{ subject: string }>>);
const meeting = vi.hoisted(() => ({
  rail: "jitsi" as "jitsi" | "vdo" | "static",
  jitsiDomain: "meet.onecocreation.com",
  allowStaticLinks: false,
}));

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

vi.mock("@/lib/site-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/site-config")>();
  return {
    ...actual,
    getSiteConfig: async () => ({
      ...actual.defaultSiteConfig(),
      meeting: { ...meeting },
    }),
  };
});

const FAKE_ROOM = "https://room.example.invalid/j/00000000000";

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
  meeting.rail = "jitsi";
  meeting.jitsiDomain = "meet.onecocreation.com";
  delete process.env.READ_WITH_LOVE_ROOM_URL;
});

afterEach(() => {
  delete process.env.READ_WITH_LOVE_ROOM_URL;
});

describe("the Read with Love letter (TASK-126 + TASK-132)", () => {
  it("jitsi config → the house room link, the moderator word, and no 'Zoom'", async () => {
    const { sendReadWithLoveLetter } = await leadMagnet();
    await sendReadWithLoveLetter("reader@example.com");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Read with Love — your seat");
    expect(sent[0].html).toContain('href="https://meet.onecocreation.com/read-with-love"');
    expect(sent[0].html).toContain("moderator"); // guests wait for Love — said in the letter
    expect(sent[0].html.toLowerCase()).not.toContain("zoom");
    expect(sent[0].html).not.toContain("Unzip Into the New You");
  });

  it("vdo config → the VDO.Ninja guest link for the fixed room", async () => {
    meeting.rail = "vdo";
    const { sendReadWithLoveLetter } = await leadMagnet();
    await sendReadWithLoveLetter("reader@example.com");
    expect(sent[0].html).toContain('href="https://vdo.ninja/?room=read-with-love"');
    expect(sent[0].html.toLowerCase()).not.toContain("zoom");
    expect(sent[0].html).not.toContain("The room link is coming");
  });

  it("no rail configured → the honest 'coming' line", async () => {
    meeting.rail = "static";
    const { sendReadWithLoveLetter } = await leadMagnet();
    await sendReadWithLoveLetter("reader@example.com");
    expect(sent[0].html).toContain("The room link is coming");
    expect(sent[0].html).toContain("before the first reading.");
    expect(sent[0].html.toLowerCase()).not.toContain("zoom");
  });

  it("the override env READ_WITH_LOVE_ROOM_URL wins when set (a fake URL, the test's alone)", async () => {
    process.env.READ_WITH_LOVE_ROOM_URL = FAKE_ROOM;
    const { sendReadWithLoveLetter } = await leadMagnet();
    await sendReadWithLoveLetter("reader@example.com");
    expect(sent[0].html).toContain(`href="${FAKE_ROOM}"`);
    expect(sent[0].html).not.toContain("read-with-love");
    expect(sent[0].html).not.toContain("The room link is coming");
    expect(sent[0].html.toLowerCase()).not.toContain("zoom");
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
