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

export const REFUSE_STAR_OR_BRACKET = "These words have stars (*) or brackets typed in them, and a letter cannot keep those yet. Take them out, and use the Bold, Italic and link buttons instead.";

const IMG = /!\[[^\]]*\]\(https?:[^)\s]+\)/g;
const SLOT = /\{\{\s*([a-z]+)\s*\}\}/gi;
const LINK = /\[([^\]]+)\]\((https?:[^)\s]+|\/(?!\/)[^)\s]*)\)/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const ITAL = /\*([^*\n]+)\*/g;

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

/**
 * One line, read the way the mail reads it (bodyToHtml in letters.ts): the
 * links first, then every **bold** from the left, then every *italic* from the
 * left over what is left. So ***x*** is bold and italic, an italic can hold a
 * bold, and the editor shows exactly what the mail will draw.
 */
function inline(s: string): DocNode[] {
  if (!s) return [];
  // pictures and blanks: atoms, kept as the exact source text
  const atoms = [...s.matchAll(new RegExp(`${IMG.source}|${SLOT.source}`, "gi"))];
  if (atoms.length) {
    const out: DocNode[] = [];
    let at = 0;
    for (const m of atoms) {
      out.push(...inline(s.slice(at, m.index)));
      const raw = m[0];
      const label = raw.startsWith("!") ? "picture" : (/\{\{\s*([a-z]+)\s*\}\}/i.exec(raw)?.[1] ?? raw);
      out.push({ type: "slot", attrs: { raw, label } });
      at = m.index! + raw.length;
    }
    out.push(...inline(s.slice(at)));
    return out;
  }
  /* each character once; a link's two ends stand in for the <a ...> and </a>
   * the mail writes there, which are not stars, so the patterns pass over them */
  const units: { ch: string; href?: string; end?: true }[] = [];
  let at = 0;
  for (const m of s.matchAll(new RegExp(LINK.source, "g"))) {
    for (const ch of s.slice(at, m.index).split("")) units.push({ ch });
    units.push({ ch: " ", end: true });
    for (const ch of m[1].split("")) units.push({ ch, href: m[2] });
    units.push({ ch: " ", end: true });
    at = m.index! + m[0].length;
  }
  for (const ch of s.slice(at).split("")) units.push({ ch });
  const bold = units.map(() => false);
  const italic = units.map(() => false);
  const star = units.map(() => false);
  const mark = (line: string, re: RegExp, side: number, on: boolean[]) => {
    for (const m of line.matchAll(new RegExp(re.source, "g"))) {
      const a = m.index!, b = a + m[0].length;
      for (let i = a; i < b; i++) (i < a + side || i >= b - side ? star : on)[i] = true;
    }
  };
  mark(units.map((u) => u.ch).join(""), BOLD, 2, bold);
  // the bold stars are gone (the mail has written <b> there) before italic is read
  mark(units.map((u, i) => (star[i] ? " " : u.ch)).join(""), ITAL, 1, italic);
  const out: DocNode[] = [];
  units.forEach((u, i) => {
    if (!u.end && !star[i]) out.push(mk(u.ch, { bold: bold[i], italic: italic[i], href: u.href }));
  });
  return merge(out);
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
        content.push(...inline(line));
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

/** one line without the spaces at one edge; a text run that was only spaces goes, a blank (slot) stops it */
function trimLine(line: DocNode[], side: "start" | "end"): DocNode[] {
  const nodes = line.slice();
  while (nodes.length) {
    const at = side === "start" ? 0 : nodes.length - 1;
    const n = nodes[at];
    if (n.type !== "text") break;
    const text = side === "start" ? n.text.replace(/^\s+/, "") : n.text.replace(/\s+$/, "");
    if (text) {
      nodes[at] = { ...n, text };
      break;
    }
    nodes.splice(at, 1);
  }
  return nodes;
}

/**
 * A space at a paragraph's edge (typed before Enter, or pasted in) never shows
 * in the mail, and reading the words back drops it (textToDoc trims each
 * paragraph). The check drops it too, so it is never mistaken for a star.
 */
function trimEdges(para: DocNode[][]): DocNode[][] {
  const out = para.slice();
  out[0] = trimLine(out[0], "start");
  out[out.length - 1] = trimLine(out[out.length - 1], "end");
  return out;
}

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
        if (cur.length) paras.push(trimEdges(cur));
        cur = [];
      } else cur.push(l);
    }
    if (cur.length) paras.push(trimEdges(cur));
  }
  return paras;
}

type TextNode = Extract<DocNode, { type: "text" }>;
const hrefOf = (n: DocNode) => (n.type === "text" ? n.marks?.find((m): m is Extract<DocMark, { type: "link" }> => m.type === "link")?.attrs.href : undefined);
const has = (n: TextNode, type: "bold" | "italic") => !!n.marks?.some((m) => m.type === type);

function lineToText(nodes: DocNode[]): string {
  let out = "";
  for (let i = 0; i < nodes.length; ) {
    const n = nodes[i];
    if (n.type !== "text") {
      out += n.type === "slot" ? n.attrs.raw : "";
      i++;
      continue;
    }
    // the words that share one link (or no link) are written together
    const href = hrefOf(n);
    const run: TextNode[] = [];
    while (i < nodes.length && nodes[i].type === "text" && hrefOf(nodes[i]) === href) run.push(nodes[i++] as TextNode);
    out += href ? `[${wrapMarks(run)}](${href})` : wrapMarks(run);
  }
  return out;
}

/**
 * Bold and italic for a run of words. Italic words that sit together get ONE
 * pair of stars round them all, with their bold words inside: an italic that
 * holds a bold is the one mix the mail can draw (it reads every **bold** before
 * any *italic*), so bold and italic on the same words is ***words***.
 */
function wrapMarks(run: TextNode[]): string {
  let out = "";
  for (let i = 0; i < run.length; ) {
    if (!has(run[i], "italic")) {
      out += has(run[i], "bold") ? `**${run[i].text}**` : run[i].text;
      i++;
      continue;
    }
    let inner = "";
    for (; i < run.length && has(run[i], "italic"); i++) inner += has(run[i], "bold") ? `**${run[i].text}**` : run[i].text;
    out += `*${inner}*`;
  }
  return out;
}

export type DocText = { ok: true; lines: string[] } | { ok: false; reason: string };

/** the editor document back to legacy lines, or a plain reason it cannot be stored faithfully */
export function docToText(doc: LetterDoc): DocText {
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
export const LINK_REFUSAL = "Links start with https:// (another site) or with / (a page on this site).";

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
