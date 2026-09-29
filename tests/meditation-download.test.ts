import { describe, it, expect, beforeEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-492 (block 969,094 a₿) — R-077, the meditation downloads. The gift's
 * letter button DOWNLOADS the mp3 (a new route serves it as
 * `content-disposition: attachment` at /meditation/download), and a Listen
 * line under the button plays the SAME file in the browser at the existing
 * static path /audio/unzip-into-the-new-you.mp3 (no attachment disposition,
 * no route handler shadows it). Both render paths of sendLeadMagnetLetter
 * (Love's /a/letters override AND the hardcoded fallback) carry both doors,
 * the button's label says Download, and the gift's name "Unzip Into the New
 * You" stays in the html (the read-with-love-letter.test.ts pin's spirit).
 *
 * The mail rail, the drip queue, and the letter-override store are mocked —
 * the spec pins the LETTER's hrefs and the ROUTE's headers, not SMTP or KV.
 */

const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; html: string }>);
const overrides = vi.hoisted(() => new Map<string, { subject: string; body: string }>());

vi.mock("@/lib/mail", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: async (_persona: string, mail: { to: string; subject: string; html: string }) => {
      sent.push(mail);
    },
  };
});

vi.mock("@/lib/mail-queue", () => ({
  enqueue: async (jobs: Array<{ subject: string }>) => jobs.length,
}));

vi.mock("@/lib/letters", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/letters")>();
  return {
    ...actual,
    getLetterOverride: async (key: string) => overrides.get(key) ?? null,
  };
});

const MP3_PATH = path.join(process.cwd(), "public", "audio", "unzip-into-the-new-you.mp3");

describe("the download route serves the gift as an attachment (R-077)", () => {
  it("GET 200s: attachment disposition naming the mp3, audio/mpeg, the real file's length", async () => {
    const { GET } = await import("@/app/meditation/download/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="unzip-into-the-new-you.mp3"',
    );
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    const stat = await fs.stat(MP3_PATH);
    expect(res.headers.get("content-length")).toBe(String(stat.size));
    await res.body?.cancel();
  });

  it("the Listen path stays the plain static file: on disk, and no route handler shadows /audio/", async () => {
    const stat = await fs.stat(MP3_PATH);
    expect(stat.size).toBeGreaterThan(0);
    await expect(fs.stat(path.join(process.cwd(), "src", "app", "audio"))).rejects.toThrow();
  });
});

describe("the lead-magnet letter points at both doors, both render paths", () => {
  beforeEach(() => {
    sent.length = 0;
    overrides.clear();
  });

  const expectBothDoors = (html: string, base: string) => {
    expect(html).toContain(`href="${base}/meditation/download"`); // the Download pill
    expect(html).toContain(`href="${base}/audio/unzip-into-the-new-you.mp3"`); // the Listen link
    expect(html).toContain("Download"); // R-077: the button says Download
    expect(html).toContain("Listen");
    expect(html).toContain("Unzip Into the New You"); // the gift's name stays
  };

  it("WITH Love's override body", async () => {
    overrides.set("lead-magnet", {
      subject: "Your free meditation",
      body: "Welcome, beautiful soul. Here is your gift.",
    });
    const { sendLeadMagnetLetter } = await import("@/lib/lead-magnet");
    const { siteBase } = await import("@/lib/subscribers");
    await sendLeadMagnetLetter("reader@example.com");
    expect(sent).toHaveLength(1);
    expectBothDoors(sent[0].html, siteBase());
  });

  it("WITHOUT an override (the hardcoded fallback)", async () => {
    const { sendLeadMagnetLetter } = await import("@/lib/lead-magnet");
    const { siteBase } = await import("@/lib/subscribers");
    await sendLeadMagnetLetter("reader@example.com");
    expect(sent).toHaveLength(1);
    expectBothDoors(sent[0].html, siteBase());
  });
});
