import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

/**
 * T-552 (the letters room rebuild): the GOLDEN RENDER. Every seeded letter's
 * default body, crossed with the three option sets the house uses, plus an
 * edge corpus, must render to the exact same HTML forever. The golden file
 * was generated on main BEFORE any T-552 change. Any later lane that touches
 * letterHtml / mail.ts must keep this green with NO golden edit. To
 * regenerate on purpose: UPDATE_LETTERS_GOLDEN=1 npx vitest run this file.
 */
process.env.NEXT_PUBLIC_SITE_URL = "https://golden.example";

const GOLDEN = resolve(__dirname, "fixtures/letters-render-golden.json");
const OPTION_SETS: Record<string, { unsubscribeUrl?: string; webUrl?: string }> = {
  none: {},
  web: { webUrl: "https://golden.example/letters/x" },
  list: { unsubscribeUrl: "https://golden.example/u/abc", webUrl: "https://golden.example/letters/x" },
};
const EDGE: Record<string, string> = {
  "bad-url-hero": "!hero: javascript:alert(1)\n\nHello there.",
  "bar-in-blurb": "Hi.\n\n!section: Title | | /store | a blurb | with a bar",
  "two-ctas": "Hi.\n\n!cta: First | /a\n!cta: Second | https://golden.example/b",
  "nested-marks": "***both*** and **bold *inner* bold** and *it\nalic*",
  "crlf-body": "Line one\r\nLine two\r\n\r\nPara two",
  "style-literal": "!style: align=center\n\nPlain words with !style: inside.",
  "brand-only": "Just a plain letter.\n\nWith love,\nLove",
  "link-forms": "A [site](/rooms/x) and [out](https://example.com/y) and [bad](javascript:x) and ![pic](https://example.com/p.png)",
  "rich-all": "!hero: /images/h.png\n\nWords.\n\n!section: Card | /images/c.png | /store | Blurb here\n!cta: Go | /go",
};

async function renderAll(): Promise<Record<string, string>> {
  const { letterHtml, LETTER_DEFAULTS, EDITABLE_LETTERS } = await import("@/lib/letters");
  const out: Record<string, string> = {};
  const sha = (s: string) => createHash("sha256").update(s).digest("hex");
  for (const k of EDITABLE_LETTERS) {
    const d = LETTER_DEFAULTS[k];
    if (!d) continue;
    for (const [on, o] of Object.entries(OPTION_SETS)) out[`default:${k}:${on}`] = sha(letterHtml(d.body, o));
  }
  for (const [n, b] of Object.entries(EDGE)) {
    for (const [on, o] of Object.entries(OPTION_SETS)) out[`edge:${n}:${on}`] = sha(letterHtml(b, o));
  }
  return out;
}

describe("T-552 golden letter render", () => {
  it("every seeded default and edge body renders byte-identically to the golden", async () => {
    const now = await renderAll();
    if (process.env.UPDATE_LETTERS_GOLDEN === "1" || !existsSync(GOLDEN)) {
      writeFileSync(GOLDEN, JSON.stringify(now, null, 1) + "\n");
    }
    const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as Record<string, string>;
    expect(Object.keys(now).sort()).toEqual(Object.keys(golden).sort());
    for (const k of Object.keys(golden)) expect(now[k], k).toBe(golden[k]);
    expect(Object.keys(golden).filter((k) => k.startsWith("default:")).length).toBeGreaterThanOrEqual(36);
  });
});
