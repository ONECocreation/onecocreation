import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { LETTER_DEFAULTS } from "../src/lib/letters";
import { holdReminderLetters } from "../src/lib/cart-reminders";

/**
 * T-582 (the Admiral, block 970,203): "clean up the long dashes in subjects
 * too." House law: no long dash (em or en) in public copy. Subjects only;
 * bodies are out of scope. Love's KV overrides are her own words.
 */
const DASH = /[—–]/;

describe("T-582: no long dash in any email subject the code writes", () => {
  it("every seeded letter default has a dash-free subject", () => {
    const entries = Object.entries(LETTER_DEFAULTS);
    expect(entries.length).toBeGreaterThan(5);
    for (const [key, v] of entries) {
      expect(v?.subject ?? "", `letter ${key}`).not.toMatch(DASH);
    }
  });

  it("the hold reminder builder writes dash-free subjects", () => {
    const mails = holdReminderLetters({
      to: "a@b.c", cartId: "c", holdId: "h", serviceTitle: "Discovery Call",
      whenLocal: "Monday", artistTz: "America/Denver", holdUntilMs: Date.now() + 9e7, baseUrl: "https://x.test",
    });
    expect(mails.length).toBeGreaterThan(0);
    for (const m of mails) expect(m.subject).not.toMatch(DASH);
  });

  it("no `subject:` literal anywhere in src carries a long dash (static walk of the builders)", () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(n)) files.push(p);
      }
    };
    walk(join(__dirname, "..", "src"));
    const bad: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (/\bsubject\s*[:=]\s*[`"']/.test(line) && DASH.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
