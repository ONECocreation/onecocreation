import { describe, it, expect } from "vitest";

/**
 * T-604 (letters 553a): the block model. Opening a letter and writing it back
 * with no edit is byte for byte the same; the mail render of the written-back
 * body equals the render of the original; an edit touches only its own lines.
 */
process.env.NEXT_PUBLIC_SITE_URL = "https://golden.example";

import { EDITABLE_LETTERS, LETTER_DEFAULTS, bodyToHtml, letterHtml } from "@/lib/letters";
import {
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
  type DocMark,
  type DocNode,
  type DocParagraph,
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
  it("a space at a paragraph's edge is dropped, never refused as a star (Love's 'Not saved', Nov 2026)", () => {
    const para = (...content: DocNode[]) => ({ type: "paragraph" as const, content });
    const t = (text: string, mark?: "bold") => (mark ? { type: "text" as const, text, marks: [{ type: mark }] } : { type: "text" as const, text });
    const cases: [DocParagraph[], string[]][] = [
      [[para(t("As Always. IAM, WE ARE One. ")), para(t("One Cocreation"))], ["As Always. IAM, WE ARE One.", "", "One Cocreation"]],
      [[para(t(" One Cocreation"))], ["One Cocreation"]],
      [[para(t("One Cocreation "))], ["One Cocreation"]],
      [[para(t("One Cocreation "), { type: "hardBreak" })], ["One Cocreation"]],
      [[para(t("One", "bold"), t(" "))], ["**One**"]],
      [[para(t("Love ", "bold"))], ["**Love**"]],
      [[para(t("a "), { type: "hardBreak" }, t("  "), { type: "hardBreak" }, t("b"))], ["a", "", "b"]],
    ];
    for (const [content, lines] of cases) expect(docToText({ type: "doc", content }), JSON.stringify(content)).toEqual({ ok: true, lines });
  });
  it("a space inside a paragraph, before a line break, is kept as typed", () => {
    const doc = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "As Always. " }, { type: "hardBreak" as const }, { type: "text" as const, text: "Love" }] }] };
    expect(docToText(doc)).toEqual({ ok: true, lines: ["As Always. ", "Love"] });
  });
  it("an edge space typed into a letter saves the letter", () => {
    const m = parseLetter("Hi there");
    const doc = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Hi there, love " }] }] };
    const r = applyTextEdit(m, 0, doc);
    expect(r.ok && serializeLetter(r.model)).toBe("Hi there, love");
  });
  it("a link mark the editor decorates (target, rel, class) still writes back", () => {
    const doc = {
      type: "doc" as const,
      content: [{ type: "paragraph" as const, content: [
        { type: "text" as const, text: "Hi", marks: [{ type: "link" as const, attrs: { href: "https://example.com/x", target: "_blank", rel: "noopener", class: null } as never }, { type: "bold" as const }] },
        { type: "text" as const, text: " there", marks: [{ type: "link" as const, attrs: { href: "https://example.com/x", target: "_blank" } as never }] },
      ] }],
    };
    expect(docToText(doc)).toEqual({ ok: true, lines: ["[**Hi** there](https://example.com/x)"] });
  });
  it("the editor's own key order (marks before text) writes back", () => {
    const doc = JSON.parse('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Welcome"},{"type":"text","text":" home."}]}]}');
    expect(docToText(doc)).toEqual({ ok: true, lines: ["**Welcome** home."] });
  });
  it("keeps bold and italic on the same words, as three stars (the Admiral and Love, Nov 2026)", () => {
    const both = [{ type: "bold" as const }, { type: "italic" as const }];
    const doc = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Hello, Beautiful Soul!", marks: both }] }] };
    expect(docToText(doc)).toEqual({ ok: true, lines: ["***Hello, Beautiful Soul!***"] });
    // and a letter that already has ***words*** opens with them bold and italic, no stars showing
    expect(textToDoc(["***Hello, Beautiful Soul!***"]).content[0].content).toEqual([{ type: "text", text: "Hello, Beautiful Soul!", marks: both }]);
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

/* the mail is the truth: what the editor shows is what the mail draws, for
 * every mix of plain, bold, italic, both and a link on Love's own words */
describe("bold, italic and both, the editor and the mail agree", () => {
  type K = "plain" | "bold" | "italic" | "both";
  const KINDS: K[] = ["plain", "bold", "italic", "both"];
  const WORDS = ["IAM", "OneCocreation", "One Cocreation"];
  const node = (k: K, text: string, href?: string): DocNode => {
    const marks: DocMark[] = [];
    if (href) marks.push({ type: "link", attrs: { href } });
    if (k === "bold" || k === "both") marks.push({ type: "bold" });
    if (k === "italic" || k === "both") marks.push({ type: "italic" });
    return marks.length ? { type: "text", text, marks } : { type: "text", text };
  };
  /* each character with how it looks: B bold, I italic, L in a link */
  const look = (ch: string, b: boolean, i: boolean, l: boolean) => `${ch}${b ? "B" : ""}${i ? "I" : ""}${l ? "L" : ""}|`;
  const mailLook = (html: string) => {
    let b = 0, i = 0, l = 0, out = "";
    for (const t of html.match(/<[^>]+>|[^<]/g) ?? []) {
      if (t === "<b>") b++;
      else if (t === "</b>") b--;
      else if (t === "<i>") i++;
      else if (t === "</i>") i--;
      else if (t.startsWith("<a ")) l++;
      else if (t === "</a>") l--;
      else if (!t.startsWith("<")) out += look(t, b > 0, i > 0, l > 0);
    }
    return out;
  };
  const docLook = (nodes: DocNode[]) =>
    nodes.map((n) => (n.type !== "text" ? "" : [...n.text].map((ch) => look(ch, !!n.marks?.some((m) => m.type === "bold"), !!n.marks?.some((m) => m.type === "italic"), !!n.marks?.some((m) => m.type === "link"))).join(""))).join("");
  it("every mix of three runs, with and without spaces and links, saves and draws as edited", () => {
    let tried = 0;
    for (const a of KINDS) for (const b of KINDS) for (const c of KINDS) for (const sep of ["", " "]) for (const linkAt of [-1, 0, 1, 2]) {
      const nodes = [a, b, c].map((k, i) => node(k, (i ? sep : "") + WORDS[i], i === linkAt ? "/replays" : undefined));
      const tag = `${a}+${b}+${c} sep=${JSON.stringify(sep)} link=${linkAt}`;
      const r = docToText({ type: "doc", content: [{ type: "paragraph", content: nodes }] });
      expect(r.ok, tag).toBe(true);
      if (!r.ok) continue;
      expect(mailLook(bodyToHtml(r.lines.join("\n"))), `${tag}: ${r.lines[0]}`).toBe(docLook(nodes));
      expect(docLook(textToDoc(r.lines).content[0].content ?? []), tag).toBe(docLook(nodes));
      tried++;
    }
    expect(tried).toBe(4 * 4 * 4 * 2 * 4);
  });
  it("Love's sign-off keeps IAM and OneCocreation spelled as written, in any style, through save and the mail", () => {
    const m = parseLetter("Smiles\nLove\n\nAs Always. IAM, WE ARE One.\nOneCocreation");
    const both = [{ type: "bold" as const }, { type: "italic" as const }];
    const doc = { type: "doc" as const, content: [
      { type: "paragraph" as const, content: [{ type: "text" as const, text: "Smiles" }, { type: "hardBreak" as const }, { type: "text" as const, text: "Love", marks: [{ type: "italic" as const }] }] },
      { type: "paragraph" as const, content: [{ type: "text" as const, text: "As Always. " }, { type: "text" as const, text: "IAM", marks: both }, { type: "text" as const, text: ", WE ARE One." }, { type: "hardBreak" as const }, { type: "text" as const, text: "OneCocreation", marks: [{ type: "bold" as const }] }] },
    ] };
    const r = applyTextEdit(m, 0, doc);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const body = serializeLetter(r.model);
    expect(body).toBe("Smiles\n*Love*\n\nAs Always. ***IAM***, WE ARE One.\n**OneCocreation**");
    const html = letterHtml(body, {});
    expect(html).toContain("<i><b>IAM</b></i>, WE ARE One.");
    expect(html).toContain("<b>OneCocreation</b>");
    expect(html).toContain("<i>Love</i>");
  });
});

describe("the link address rule", () => {
  it("admits https and ONE leading slash, nothing else", () => {
    for (const ok of ["https://example.com/x", "/rooms/x", "/"]) expect(admitsLinkAddress(ok), ok).toBe(true);
    for (const no of ["http://example.com", "//evil.example", "javascript:alert(1)", "mailto:a@b.c", "example.com", "", "https://a b", "https://a)b"])
      expect(admitsLinkAddress(no), no).toBe(false);
  });
});
