/**
 * T-604 (letters 553a): the letter as blocks. Pure and client-safe (no
 * server-only imports), so a vitest can run it and the edit page can use it.
 *
 * The stored format does not change: a letter is one `body` string. This file
 * only READS it into segments and WRITES it back:
 *  - a directive segment is ONE line (`!hero:`, `!section:`, `!cta:`), kept
 *    verbatim and in its stored position, found by the SAME three tests and
 *    the same admit rule that `letterHtml` (src/lib/letters.ts) uses;
 *  - a text segment is a run of the other lines, kept as its original lines.
 * Joining the lines of every segment with "\n" gives the original body back
 * exactly, so opening a letter and pressing Publish with no edit writes
 * nothing different. Only a text segment the writer actually edits is
 * rebuilt, from the editor document, and only after a faithful-round-trip
 * check (a star or a bracket pair the legacy format cannot store is refused).
 */

/** the directive URL admit rule, copied from letters.ts (admitsDirectiveUrl) */
const admits = (u: string) => u.startsWith("https://") || (u.startsWith("/") && !u.startsWith("//"));

export type DirectiveKind = "hero" | "section" | "cta";

export interface Directive {
  kind: DirectiveKind;
  /** hero: the image; section: title, image, href, blurb; cta: label, href */
  url?: string;
  title?: string;
  image?: string;
  href?: string;
  blurb?: string;
  label?: string;
}

/** one line as a directive, or null when letterHtml would treat it as text */
export function parseDirective(line: string): Directive | null {
  const t = line.trim();
  const hero = /^!hero:\s*(\S+)/.exec(t);
  const sec = /^!section:\s*([^|]+)\|([^|]*)\|([^|]+)\|(.+)$/.exec(t);
  const c = /^!cta:\s*([^|]+)\|(.+)$/.exec(t);
  if (hero && admits(hero[1])) return { kind: "hero", url: hero[1] };
  if (sec && admits(sec[3].trim()) && (!sec[2].trim() || admits(sec[2].trim())))
    return { kind: "section", title: sec[1].trim(), image: sec[2].trim() || undefined, href: sec[3].trim(), blurb: sec[4].trim() };
  if (c && admits(c[2].trim())) return { kind: "cta", label: c[1].trim(), href: c[2].trim() };
  return null;
}

export type LetterSegment =
  | { kind: "text"; lines: string[] }
  | { kind: "directive"; line: string; directive: Directive };

export interface LetterModel {
  original: string;
  segments: LetterSegment[];
  /** true once a text segment was replaced; an untouched model writes `original` */
  touched: boolean;
}

export function parseLetter(body: string): LetterModel {
  const segments: LetterSegment[] = [];
  for (const line of body.split("\n")) {
    const directive = parseDirective(line);
    if (directive) segments.push({ kind: "directive", line, directive });
    else {
      const last = segments[segments.length - 1];
      if (last && last.kind === "text") last.lines.push(line);
      else segments.push({ kind: "text", lines: [line] });
    }
  }
  return { original: body, segments, touched: false };
}

export function serializeLetter(model: LetterModel): string {
  if (!model.touched) return model.original;
  return model.segments.flatMap((s) => (s.kind === "text" ? s.lines : [s.line])).join("\n");
}

/** what the mail draws from the directives, in the legacy way: the LAST hero, every card, the LAST button */
export function directivesOf(model: LetterModel): { hero?: string; cards: Directive[]; cta?: Directive } {
  let hero: string | undefined;
  let cta: Directive | undefined;
  const cards: Directive[] = [];
  for (const s of model.segments) {
    if (s.kind !== "directive") continue;
    if (s.directive.kind === "hero") hero = s.directive.url;
    else if (s.directive.kind === "section") cards.push(s.directive);
    else cta = s.directive;
  }
  return { hero, cards, cta };
}

const blank = (l: string) => l.trim().length === 0;

/** the text segments the page shows an editor for: any with words; if none has words, the first one */
export function editableIndexes(model: LetterModel): number[] {
  const words: number[] = [];
  let firstText = -1;
  model.segments.forEach((s, i) => {
    if (s.kind !== "text") return;
    if (firstText < 0) firstText = i;
    if (s.lines.some((l) => !blank(l))) words.push(i);
  });
  if (words.length > 0) return words;
  return firstText >= 0 ? [firstText] : [];
}

/** a letter with directive lines only has no text segment: add an empty one at the end */
export function withTextSegment(model: LetterModel): LetterModel {
  if (model.segments.some((s) => s.kind === "text")) return model;
  return { ...model, segments: [...model.segments, { kind: "text", lines: [""] }] };
}

/* ---------- the editor document (TipTap JSON) and the legacy markdown ---------- */

export type DocMark = { type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } };
export type DocNode =
  | { type: "text"; text: string; marks?: DocMark[] }
  | { type: "hardBreak" }
  | { type: "slot"; attrs: { raw: string; label: string } };
export interface DocParagraph {
  type: "paragraph";
  content?: DocNode[];
}
export interface LetterDoc {
  type: "doc";
  content: DocParagraph[];
}

export const REFUSE_STAR_OR_BRACKET = "A star or a bracket pair next to a bracket cannot be kept in a letter yet.";
export const REFUSE_BOLD_ITALIC = "Bold and italic on the same words cannot be kept in a letter yet. Use one or the other.";

const IMG = /!\[[^\]]*\]\(https?:[^)\s]+\)/g;
const SLOT = /\{\{\s*([a-z]+)\s*\}\}/gi;
const LINK = /\[([^\]]+)\]\((https?:[^)\s]+|\/(?!\/)[^)\s]*)\)/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const ITAL = /\*([^*\n]+)\*/g;

type Mk = "bold" | "italic";
interface Ctx {
  bold: boolean;
  italic: boolean;
  href?: string;
}

function mk(text: string, c: Ctx): DocNode {
  const marks: DocMark[] = [];
  if (c.href) marks.push({ type: "link", attrs: { href: c.href } });
  if (c.bold) marks.push({ type: "bold" });
  if (c.italic) marks.push({ type: "italic" });
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

/** matches of `re` in `s` that do not cut a link: whole links inside the match are fine, a match inside a link label waits for the label's own pass */
function spans(s: string, re: RegExp): RegExpExecArray[] {
  const links = [...s.matchAll(LINK)].map((m) => [m.index!, m.index! + m[0].length] as const);
  const out: RegExpExecArray[] = [];
  for (const m of s.matchAll(re)) {
    const a = m.index!, b = a + m[0].length;
    const ok = links.every(([ls, le]) => b <= ls || a >= le || (a <= ls && b >= le));
    if (ok) out.push(m as RegExpExecArray);
  }
  return out;
}

function inline(s: string, c: Ctx): DocNode[] {
  if (!s) return [];
  // pictures and blanks: atoms, kept as the exact source text
  const atoms = [...s.matchAll(new RegExp(`${IMG.source}|${SLOT.source}`, "gi"))];
  if (atoms.length) {
    const out: DocNode[] = [];
    let at = 0;
    for (const m of atoms) {
      out.push(...inline(s.slice(at, m.index), c));
      const raw = m[0];
      const label = raw.startsWith("!") ? "picture" : (/\{\{\s*([a-z]+)\s*\}\}/i.exec(raw)?.[1] ?? raw);
      out.push({ type: "slot", attrs: { raw, label } });
      at = m.index! + raw.length;
    }
    out.push(...inline(s.slice(at), c));
    return out;
  }
  for (const [re, key] of [[BOLD, "bold"], [ITAL, "italic"]] as [RegExp, Mk][]) {
    const ms = spans(s, new RegExp(re.source, "g"));
    if (ms.length === 0 || c[key]) continue;
    const out: DocNode[] = [];
    let at = 0;
    for (const m of ms) {
      out.push(...inline(s.slice(at, m.index), c));
      out.push(...inline(m[1], { ...c, [key]: true }));
      at = m.index! + m[0].length;
    }
    out.push(...inline(s.slice(at), c));
    return out;
  }
  if (!c.href) {
    const ms = [...s.matchAll(new RegExp(LINK.source, "g"))];
    if (ms.length) {
      const out: DocNode[] = [];
      let at = 0;
      for (const m of ms) {
        out.push(...inline(s.slice(at, m.index), c));
        out.push(...inline(m[1], { ...c, href: m[2] }));
        at = m.index! + m[0].length;
      }
      out.push(...inline(s.slice(at), c));
      return out;
    }
  }
  return [mk(s, c)];
}

/** the text lines of one block to the editor document: blank line = paragraph, newline = hard break */
export function textToDoc(lines: string[]): LetterDoc {
  const core = lines.join("\n").trim();
  const paragraphs = core.length ? core.split(/\n\s*\n/).filter((p) => p.trim().length > 0) : [];
  return {
    type: "doc",
    content: paragraphs.map((p) => {
      const content: DocNode[] = [];
      p.trim().split("\n").forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        content.push(...inline(line, { bold: false, italic: false }));
      });
      return { type: "paragraph" as const, content: merge(content) };
    }),
  };
}

const sameMarks = (a?: DocMark[], b?: DocMark[]) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

function merge(nodes: DocNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (const n of nodes) {
    const last = out[out.length - 1];
    if (n.type === "text" && last && last.type === "text" && sameMarks(last.marks, n.marks)) {
      out[out.length - 1] = { ...last, text: last.text + n.text };
    } else out.push(n);
  }
  return out.filter((n) => n.type !== "text" || n.text.length > 0);
}

const rank = (m: DocMark) => (m.type === "link" ? 0 : m.type === "bold" ? 1 : 2);

/** the canonical shape: marks ordered, runs merged, doubled breaks become paragraph breaks, empty paragraphs dropped */
function canonical(doc: LetterDoc): DocNode[][][] {
  const paras: DocNode[][][] = [];
  for (const p of doc.content ?? []) {
    let lines: DocNode[][] = [[]];
    for (const n of p.content ?? []) {
      if (n.type === "hardBreak") lines.push([]);
      else {
        /* a link mark keeps only its address: the editor adds target, rel and class the format cannot hold */
        const marks = n.type === "text" && n.marks
          ? n.marks.map((m): DocMark => (m.type === "link" ? { type: "link", attrs: { href: m.attrs.href } } : { type: m.type })).sort((a, b) => rank(a) - rank(b))
          : undefined;
        lines[lines.length - 1].push(n.type === "text" ? (marks?.length ? { type: "text", text: n.text, marks } : { type: "text", text: n.text }) : n);
      }
    }
    lines = lines.map((l) => merge(l));
    const empty = (l: DocNode[]) => l.every((n) => n.type === "text" && n.text.trim().length === 0);
    // an empty line (a doubled break, or a break at an edge) splits or trims
    let cur: DocNode[][] = [];
    for (const l of lines) {
      if (empty(l)) {
        if (cur.length) paras.push(cur);
        cur = [];
      } else cur.push(l);
    }
    if (cur.length) paras.push(cur);
  }
  return paras;
}

function lineToText(nodes: DocNode[]): string {
  let out = "";
  for (let i = 0; i < nodes.length; ) {
    const n = nodes[i];
    const href = n.type === "text" ? n.marks?.find((m) => m.type === "link") : undefined;
    if (href && href.type === "link") {
      let j = i;
      let label = "";
      while (j < nodes.length) {
        const m = nodes[j];
        const h = m.type === "text" ? m.marks?.find((x) => x.type === "link") : undefined;
        if (!h || h.type !== "link" || h.attrs.href !== href.attrs.href) break;
        label += wrapMarks(m as Extract<DocNode, { type: "text" }>);
        j++;
      }
      out += `[${label}](${href.attrs.href})`;
      i = j;
    } else {
      out += n.type === "text" ? wrapMarks(n) : n.type === "slot" ? n.attrs.raw : "";
      i++;
    }
  }
  return out;
}

function wrapMarks(n: Extract<DocNode, { type: "text" }>): string {
  const bold = n.marks?.some((m) => m.type === "bold");
  const ital = n.marks?.some((m) => m.type === "italic");
  return bold ? `**${n.text}**` : ital ? `*${n.text}*` : n.text;
}

export type DocText = { ok: true; lines: string[] } | { ok: false; reason: string };

/** the editor document back to legacy lines, or a plain reason it cannot be stored faithfully */
export function docToText(doc: LetterDoc): DocText {
  for (const p of doc.content ?? [])
    for (const n of p.content ?? [])
      if (n.type === "text" && n.marks?.some((m) => m.type === "bold") && n.marks?.some((m) => m.type === "italic"))
        return { ok: false, reason: REFUSE_BOLD_ITALIC };
  const paras = canonical(doc);
  const text = paras.map((p) => p.map(lineToText).join("\n")).join("\n\n");
  // the faithful check: reading the words back must give the same document
  if (JSON.stringify(canonical(textToDoc(text.split("\n")))) !== JSON.stringify(paras)) return { ok: false, reason: REFUSE_STAR_OR_BRACKET };
  return { ok: true, lines: text.length ? text.split("\n") : [] };
}

/** the link address rule, the same as bodyToHtml: https:// or ONE leading slash, never //host */
export function admitsLinkAddress(u: string): boolean {
  const t = u.trim();
  return /^https:\/\/[^\s)]+$/.test(t) || /^\/(?!\/)[^\s)]*$/.test(t);
}
export const LINK_REFUSAL = "A link needs a full address starting with https:// or a page on this site that starts with a single /.";

/**
 * Replace one text segment with an edited document. The segment's own blank
 * edge lines (the gap before or after a directive) are kept as they were.
 */
export function applyTextEdit(model: LetterModel, index: number, doc: LetterDoc): { ok: true; model: LetterModel } | { ok: false; reason: string } {
  const seg = model.segments[index];
  if (!seg || seg.kind !== "text") return { ok: false, reason: "That part of the letter is not words." };
  const r = docToText(doc);
  if (!r.ok) return r;
  let a = 0;
  let b = seg.lines.length;
  while (a < b && blank(seg.lines[a])) a++;
  while (b > a && blank(seg.lines[b - 1])) b--;
  const lead = a === b ? [] : seg.lines.slice(0, a);
  const trail = a === b ? [] : seg.lines.slice(b);
  const segments = model.segments.slice();
  segments[index] = { kind: "text", lines: [...lead, ...r.lines, ...trail] };
  return { ok: true, model: { ...model, segments, touched: true } };
}
