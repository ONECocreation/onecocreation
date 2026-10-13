import { describe, it, expect } from "vitest";

/**
 * T-604 (letters 553a): the block model. Opening a letter and writing it back
 * with no edit is byte for byte the same; the mail render of the written-back
 * body equals the render of the original; an edit touches only its own lines.
 */
process.env.NEXT_PUBLIC_SITE_URL = "https://golden.example";

import { EDITABLE_LETTERS, LETTER_DEFAULTS, letterHtml } from "@/lib/letters";
import {
  REFUSE_BOLD_ITALIC,
  REFUSE_STAR_OR_BRACKET,
  admitsLinkAddress,
  applyTextEdit,
  directivesOf,
  docToText,
  editableIndexes,
  parseLetter,
  serializeLetter,
  textToDoc,
  withTextSegment,
} from "@/lib/letter-model";

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
const CORPUS: Record<string, string> = { ...EDGE, empty: "", "only-directive": "!cta: Go | /go" };
for (const k of EDITABLE_LETTERS) {
  const d = LETTER_DEFAULTS[k];
  if (d) CORPUS[`default:${k}`] = d.body;
}
const OPTS = [{}, { webUrl: "https://golden.example/letters/x" }, { unsubscribeUrl: "https://golden.example/u/abc", webUrl: "https://golden.example/letters/x" }];

describe("the block model keeps the stored letter", () => {
  it("has a real corpus", () => {
    expect(Object.keys(CORPUS).filter((k) => k.startsWith("default:")).length).toBeGreaterThanOrEqual(10);
  });
  for (const [name, body] of Object.entries(CORPUS)) {
    it(`${name}: parse then serialize is the same string, and the same mail`, () => {
      const m = parseLetter(body);
      expect(serializeLetter(m)).toBe(body);
      // the lines alone rejoin to the original (the model holds every line)
      expect(m.segments.flatMap((s) => (s.kind === "text" ? s.lines : [s.line])).join("\n")).toBe(body);
      for (const o of OPTS) expect(letterHtml(serializeLetter(m), o)).toBe(letterHtml(body, o));
    });
  }
  it("a directive that fails the admit rule is text, as letterHtml treats it", () => {
    const m = parseLetter("!hero: javascript:alert(1)\n!cta: Go | //evil.example\nWords");
    expect(m.segments).toHaveLength(1);
    expect(m.segments[0].kind).toBe("text");
  });
  it("finds the last hero, every card and the last button, as the mail does", () => {
    const d = directivesOf(parseLetter("!hero: /a.png\n!hero: /b.png\nHi\n!section: T | /i.png | /x | blurb\n!section: U | | /y | more\n!cta: One | /1\n!cta: Two | /2"));
    expect(d.hero).toBe("/b.png");
    expect(d.cards.map((c) => c.title)).toEqual(["T", "U"]);
    expect(d.cta?.label).toBe("Two");
  });
});

describe("an edit changes only its own lines", () => {
  const body = "Hello {{who}}.\n\nSecond paragraph.\n\n!section: Card | /i.png | /store | Blurb here\nMore words\n!cta: Go | /go\n!hero: /h.png";
  it("leaves directive lines byte-identical and in place", () => {
    const m = parseLetter(body);
    const idx = editableIndexes(m);
    expect(idx).toEqual([0, 2]);
    const doc = textToDoc((m.segments[0] as { lines: string[] }).lines);
    // make "Second" bold
    const p2 = doc.content[1];
    p2.content = [{ type: "text", text: "Second", marks: [{ type: "bold" }] }, { type: "text", text: " paragraph." }];
    const r = applyTextEdit(m, 0, doc);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const out = serializeLetter(r.model);
    expect(out).toBe("Hello {{who}}.\n\n**Second** paragraph.\n\n!section: Card | /i.png | /store | Blurb here\nMore words\n!cta: Go | /go\n!hero: /h.png");
    expect(out.split("\n").filter((l) => l.startsWith("!"))).toEqual(body.split("\n").filter((l) => l.startsWith("!")));
  });
  it("keeps the blank gap before a directive", () => {
    const m = parseLetter("Hi\n\n!cta: Go | /go");
    const r = applyTextEdit(m, 0, textToDoc(["Hi there"]));
    expect(r.ok && serializeLetter(r.model)).toBe("Hi there\n\n!cta: Go | /go");
  });
  it("an empty body gets its first words", () => {
    const m = parseLetter("");
    const r = applyTextEdit(m, editableIndexes(m)[0], textToDoc(["Hello"]));
    expect(r.ok && serializeLetter(r.model)).toBe("Hello");
  });
  it("a letter of directives only gets one empty text block to write in", () => {
    const m = withTextSegment(parseLetter("!cta: Go | /go"));
    expect(editableIndexes(m)).toEqual([1]);
    expect(serializeLetter(m)).toBe("!cta: Go | /go");
  });
});

describe("text blocks and the editor document", () => {
  const SAMPLES = [
    "Plain words.",
    "One\ntwo lines\n\nNew paragraph",
    "A **bold** word and an *italic* one.",
    "A [site link](/rooms/x) and [out](https://example.com/y).",
    "[**bold link**](/x) and [a **bold** bit](/y)",
    "Hello {{who}}, your {{lines}} are here.\n\n{{doors}}",
    "A picture ![pic](https://example.com/p.png) in line",
    "With love,\nLove",
  ];
  for (const s of SAMPLES) {
    it(`round trips: ${JSON.stringify(s).slice(0, 48)}`, () => {
      const r = docToText(textToDoc(s.split("\n")));
      expect(r).toEqual({ ok: true, lines: s.split("\n") });
    });
  }
  it("slots parse to an atom and write back as the typed slot", () => {
    const doc = textToDoc(["Hi {{ who }}!"]);
    const slot = doc.content[0].content!.find((n) => n.type === "slot");
    expect(slot).toMatchObject({ type: "slot", attrs: { raw: "{{ who }}", label: "who" } });
    expect(docToText(doc)).toEqual({ ok: true, lines: ["Hi {{ who }}!"] });
  });
  it("refuses a literal star or a bracket pair it cannot keep", () => {
    for (const t of ["5 * 3 and 4 * 2", "see [x](https://a.example) there", "a link [y](/rooms/x) typed as words", "**bold *inner* bold**"]) {
      const doc = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: t }] }] };
      expect(docToText(doc), t).toEqual({ ok: false, reason: REFUSE_STAR_OR_BRACKET });
    }
  });
  it("refuses bold and italic on the same words", () => {
    const doc = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "both", marks: [{ type: "bold" as const }, { type: "italic" as const }] }] }] };
    expect(docToText(doc)).toEqual({ ok: false, reason: REFUSE_BOLD_ITALIC });
  });
  it("a refused edit leaves the model untouched", () => {
    const m = parseLetter("Hi");
    const doc = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "2 * 3 and 4 * 5" }] }] };
    const r = applyTextEdit(m, 0, doc);
    expect(r.ok).toBe(false);
    expect(m.touched).toBe(false);
    expect(serializeLetter(m)).toBe("Hi");
  });
  it("a doubled break becomes a paragraph break and empty paragraphs vanish", () => {
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph" as const, content: [{ type: "text" as const, text: "a" }, { type: "hardBreak" as const }, { type: "hardBreak" as const }, { type: "text" as const, text: "b" }] },
        { type: "paragraph" as const },
      ],
    };
    expect(docToText(doc)).toEqual({ ok: true, lines: ["a", "", "b"] });
  });
});

describe("the link address rule", () => {
  it("admits https and ONE leading slash, nothing else", () => {
    for (const ok of ["https://example.com/x", "/rooms/x", "/"]) expect(admitsLinkAddress(ok), ok).toBe(true);
    for (const no of ["http://example.com", "//evil.example", "javascript:alert(1)", "mailto:a@b.c", "example.com", "", "https://a b", "https://a)b"])
      expect(admitsLinkAddress(no), no).toBe(false);
  });
});
