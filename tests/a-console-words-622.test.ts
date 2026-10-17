import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, join, relative } from "path";
import ts from "typescript";

/**
 * T-622 (lane A of the /a console cleanup): the words law as a pin. Our own
 * words on the /a console (subtitles, helper text, labels, chips, empty
 * states, button labels) carry no em dash, no en dash, no arrow and no emoji.
 * The scan reads the SOURCE with the TypeScript parser and looks only at what
 * a person can read: string literals, template text and JSX text. Comments
 * are code, not words, so they are not scanned.
 *
 * Out of scope on purpose: Love's own content (her data and KV), the public
 * site pages outside /a, the public nav and footer, the public overlay scenes.
 *
 * ALLOWED (kept on purpose): the plain text marks check, cross, flag, star
 * outlines and the four-point star (U+2713 U+2715 U+2691 U+2726 U+2605 U+2606).
 * None of them is an emoji or an arrow, they are status marks already worn by
 * the kit, and the house page-slop law does not flag them either.
 */
const ROOT = resolve(__dirname, "..");

const SCAN_DIRS = ["src/app/a", "src/components/console"];
const SCAN_FILES = [
  "src/lib/console.ts",
  "src/lib/studio/scenes.ts",
  "src/lib/studio/doc.ts",
  "src/components/OperatorGate.tsx",
  "src/components/calendar/BftMonthGrid.tsx",
  "src/components/calendar/WeekRibbon.tsx",
  "src/components/calendar/CalendarOptions.tsx",
  "src/components/BriefsConnectPanel.tsx",
  "src/components/BriefsPanel.tsx",
  "src/components/ChatPanel.tsx",
  "src/components/DeployPanel.tsx",
  "src/components/MempoolPanel.tsx",
  "src/components/MudPanel.tsx",
  "src/components/SpacesPanel.tsx",
  "src/components/StatusReportsPanel.tsx",
  "src/components/SeatReservedPanel.tsx",
  "src/components/studio-overlay/StudioRoom.tsx",
  "src/components/studio-overlay/SendToUserChooser.tsx",
  "src/components/studio-overlay/JitsiDoorCard.tsx",
];

/* em dash, en dash, arrows (all blocks), triangle arrows, emoji, symbol
   dingbats; the allow-list above is carved out of the symbol ranges */
const BAD =
  /[—–←-⇿▲▶▼◀⟰-⟿⤀-⥿⬀-⯿\u{1F000}-\u{1FFFF}️☀-☄☇-⚐⚒-✒✔✖-✥✧-➿]|<-|->/u;

/* KEPT ON PURPOSE: Love's own names, not our words. The three tip-jar names
   are hers (emoji and dash included), and the "Offer on the doorstep" subject
   is the real subject line of her letter in src/lib/letters.ts, which the room
   only echoes. Each entry is matched whole, so a new glyph beside it still fails. */
const LOVES_OWN = [
  "\u{1F31F} One Cocreation",
  "\u{1F49B} Tips \u2014 Love",
  "\u{1F381} Gifts of Gratitude",
  "\u{1F49B} An offer on the doorstep",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function offenders(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const kinds = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.StringLiteral,
    ts.SyntaxKind.NoSubstitutionTemplateLiteral,
    ts.SyntaxKind.TemplateHead,
    ts.SyntaxKind.TemplateMiddle,
    ts.SyntaxKind.TemplateTail,
    ts.SyntaxKind.JsxText,
  ]);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (kinds.has(node.kind)) {
      let text = node.getText(sf);
      for (const own of LOVES_OWN) text = text.split(own).join("");
      if (BAD.test(text)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        found.push(`${relative(ROOT, file)}:${line + 1}: ${text.replace(/\s+/g, " ").slice(0, 100)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("T-622: the /a console words law (no long dash, arrow or emoji in our words)", () => {
  const files = [
    ...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))),
    ...SCAN_FILES.map((f) => join(ROOT, f)),
  ];

  it("the scan reaches the pages it claims to guard", () => {
    expect(files.length).toBeGreaterThan(60);
    for (const f of SCAN_FILES) expect(existsSync(join(ROOT, f)), f).toBe(true);
    expect(files.some((f) => f.endsWith("src/app/a/page.tsx"))).toBe(true);
    expect(files.some((f) => f.endsWith("src/components/console/StudioHub.tsx"))).toBe(true);
  });

  it("no em dash, en dash, arrow or emoji in any string, template or JSX text", () => {
    const all = files.flatMap(offenders);
    expect(all).toEqual([]);
  });

  it("the detector itself catches the glyphs it exists for", () => {
    for (const bad of ["a — b", "9–17", "go →", "← back", "↓", "▲", "✨", "🔍", "⚡", "x -> y", "x <- y"]) {
      expect(BAD.test(bad), JSON.stringify(bad)).toBe(true);
    }
    for (const ok of ["saved ✓", "close ✕", "⚑ flagged", "★ default", "a · b", "Desk › Day"]) {
      expect(BAD.test(ok), JSON.stringify(ok)).toBe(false);
    }
  });
});

describe("T-622: a Studio sub-room says its own name once", () => {
  const shell = readFileSync(join(ROOT, "src/components/console/SiteConsoleShell.tsx"), "utf8");
  it("Replays and Weekly reading get their own heading and subtitle in the header, not the Studio block", () => {
    expect(shell).toContain('replays: { title: "Replays"');
    expect(shell).toContain('reading: { title: "Weekly reading"');
    expect(shell).toContain("{subHead ? (");
  });
  it("the two rooms do not repeat their own name in the body", () => {
    const reading = readFileSync(join(ROOT, "src/app/a/site/reading/SiteReadingRoom.tsx"), "utf8");
    const replays = readFileSync(join(ROOT, "src/app/a/site/replays/SiteReplaysRoom.tsx"), "utf8");
    expect(reading).not.toMatch(/<h1[^>]*>Weekly reading<\/h1>/);
    expect(replays).not.toMatch(/<h2[^>]*>Replays<\/h2>/);
  });
});
