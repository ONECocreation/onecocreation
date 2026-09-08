import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * TASK-172 (0018.06.18 a₿) — the first welcome letter, revamped: the
 * Admiral's ask ("there are 2 items at the bottom that are just kind of
 * fillers") traced to the ACTUAL send path (src/lib/lead-magnet.ts), not
 * the shell: `welcome` had no filler cards (brandShell(bodyToHtml(...)), no
 * directives), but `welcome-day-two` never even read LETTER_DEFAULTS —
 * its own hardcoded fallback carried a four-item "little map of the field"
 * whose last two entries ("The store — meditations, affirmations and
 * adornments" and "Community — the rooms where the field gathers between
 * sessions") were the two filler items at the bottom of the real send.
 *
 * Pinned here:
 *   1. both defaults carry no PLACEHOLDER line, Love's own words (drawn
 *      from src/lib/about-content.ts), and the exact sign-off.
 *   2. letterHtml() of each default renders EXACTLY the cards the words
 *      name (one !section + one !cta for `welcome`; zero sections + one
 *      !cta for `welcome-day-two`) — no shell-added fillers.
 *   3. the real send path (enqueueWelcomeLetter / enqueueDayTwoWelcome) now
 *      routes through letterHtml() — directives render as a card/button,
 *      never literal "!cta:"/"!section:" text — and welcome-day-two finally
 *      falls back to LETTER_DEFAULTS like welcome always did.
 *   4. Love's /a/letters override still wins, untouched, for both letters.
 */

const enqueued = vi.hoisted(() => [] as Array<Array<{ to: string; subject: string; html: string }>>);
const overrides = vi.hoisted(() => new Map<string, { subject: string; body: string }>());

vi.mock("@/lib/mail-queue", () => ({
  enqueue: async (jobs: Array<{ to: string; subject: string; html: string }>) => {
    enqueued.push(jobs);
    return jobs.length;
  },
}));

vi.mock("@/lib/letters", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/letters")>();
  return {
    ...actual,
    getLetterOverride: async (key: string) => overrides.get(key) ?? null,
  };
});

beforeEach(() => {
  enqueued.length = 0;
  overrides.clear();
});

const letters = () => import("@/lib/letters");
const leadMagnet = () => import("@/lib/lead-magnet");

describe("the defaults carry Love's own words, no placeholder (TASK-172)", () => {
  it("`welcome` — subject, no PLACEHOLDER, drawn from about-content.ts, exact sign-off", async () => {
    const { LETTER_DEFAULTS } = await import("@/lib/letters");
    const tpl = LETTER_DEFAULTS.welcome!;
    expect(tpl.subject).toBe("Welcome home");
    expect(tpl.body).not.toContain("PLACEHOLDER");
    expect(tpl.body).toContain("Unzip Into the New You"); // the gift stays named
    // about-content.ts: ABOUT_BRIDGE_LINE ("You Are the Bridge, Where Heaven
    // and Earth Meet") and ABOUT_JOIN_LINES ("Breathe with us")
    expect(tpl.body.toLowerCase()).toContain("bridge, where heaven and earth meet");
    expect(tpl.body.toLowerCase()).toContain("breathe with us");
    expect(tpl.body.trim().endsWith("With love,\nLove · ONE Cocreation")).toBe(true);
  });

  it("`welcome-day-two` — no PLACEHOLDER, 'today is just a hello' stays, exact sign-off", async () => {
    const { LETTER_DEFAULTS } = await import("@/lib/letters");
    const tpl = LETTER_DEFAULTS["welcome-day-two"]!;
    expect(tpl.body).not.toContain("PLACEHOLDER");
    expect(tpl.body).toContain("today is just a hello");
    expect(tpl.body.trim().endsWith("With love,\nLove · ONE Cocreation")).toBe(true);
  });
});

describe("letterHtml() renders exactly the cards the words name — no shell-added fillers", () => {
  it("`welcome`: one !section card (the free meditation) + one !cta (the Commons), nothing else", async () => {
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const html = letterHtml(LETTER_DEFAULTS.welcome!.body);
    expect((html.match(/Read More/g) ?? []).length).toBe(1); // exactly one section card
    expect(html).toContain('href="http://localhost:3000/meditation"');
    expect(html).toContain("Step into the Commons");
    expect(html).toContain('href="http://localhost:3000/classes"');
    // no leftover generic filler copy from the old send-path fallbacks
    expect(html).not.toContain("Memberships");
    expect(html).not.toContain("Sessions");
    expect(html).not.toContain("!section:");
    expect(html).not.toContain("!cta:");
  });

  it("`welcome-day-two`: zero section cards, one !cta (memberships) — no 'little map of the field'", async () => {
    const { LETTER_DEFAULTS, letterHtml } = await letters();
    const html = letterHtml(LETTER_DEFAULTS["welcome-day-two"]!.body);
    expect((html.match(/Read More/g) ?? []).length).toBe(0); // no section cards at all
    expect(html).not.toContain("Check out"); // richShell's card-block heading never rides in
    expect(html).toContain("Step into the field");
    expect(html).toContain('href="http://localhost:3000/memberships"');
    // the two filler items the Admiral saw are gone
    expect(html).not.toContain("The store");
    expect(html).not.toContain("Community");
    expect(html).not.toContain("!cta:");
  });
});

describe("the real send path routes through letterHtml() — directives render, not literal text", () => {
  it("enqueueWelcomeLetter: the default's card + button render for real", async () => {
    const { enqueueWelcomeLetter } = await leadMagnet();
    await enqueueWelcomeLetter("reader@example.com");
    expect(enqueued).toHaveLength(1);
    const job = enqueued[0][0];
    expect(job.subject).toBe("Welcome home");
    expect(job.html).toContain("Step into the Commons");
    expect(job.html).not.toContain("!cta:");
    expect(job.html).not.toContain("!section:");
  });

  it("enqueueDayTwoWelcome: now reads LETTER_DEFAULTS (it never did before TASK-172) and the button renders", async () => {
    const { enqueueDayTwoWelcome } = await leadMagnet();
    await enqueueDayTwoWelcome("reader@example.com");
    expect(enqueued).toHaveLength(1);
    const job = enqueued[0][0];
    expect(job.subject).toBe("Welcome to the field — a note from One Cocreation");
    expect(job.html).toContain("Step into the field");
    expect(job.html).toContain('href="http://localhost:3000/memberships"');
    expect(job.html).not.toContain("The store");
    expect(job.html).not.toContain("Community");
    expect(job.html).not.toContain("!cta:");
  });
});

describe("override precedence — Love's /a/letters override still wins, untouched (TASK-172 pin)", () => {
  it("welcome: an override replaces the default entirely, directives included", async () => {
    overrides.set("welcome", {
      subject: "Love's own welcome",
      body: "Just Love's words.\n\n!cta: Her own door | /her-own-link",
    });
    const { enqueueWelcomeLetter } = await leadMagnet();
    await enqueueWelcomeLetter("reader@example.com");
    const job = enqueued[0][0];
    expect(job.subject).toBe("Love's own welcome");
    expect(job.html).toContain("Just Love's words.");
    expect(job.html).toContain("Her own door");
    expect(job.html).not.toContain("Step into the Commons"); // the default is gone
    expect(job.html).not.toContain("Unzip Into the New You");
  });

  it("welcome-day-two: an override replaces the default entirely", async () => {
    overrides.set("welcome-day-two", {
      subject: "Love's own day two",
      body: "Just Love's day-two words.",
    });
    const { enqueueDayTwoWelcome } = await leadMagnet();
    await enqueueDayTwoWelcome("reader@example.com");
    const job = enqueued[0][0];
    expect(job.subject).toBe("Love's own day two");
    expect(job.html).toContain("Just Love's day-two words.");
    expect(job.html).not.toContain("Step into the field"); // the default is gone
  });
});
