import fs from "fs";
import path from "path";
import ts from "typescript";
import { describe, it, expect } from "vitest";

/**
 * TASK-415 (block 968,172) -- THE OPERATOR SIDE'S STYLE-OBJECT CENSUS:
 * "fewer, never more", provable per PR. Astra §5's ★ row: a NEW scanner,
 * baseline, and test that fingerprint the operator side's style objects
 * BY AST, NOT BY LINE, so the unify lanes can prove the count went down.
 *
 * METRIC 1 ONLY (the cut note's ruling 1, block 968,172, superseding the
 * brief body's three-metric ask): this lane fingerprints STYLE OBJECTS --
 * every object literal that reaches a JSX `style=` attribute, however it
 * travels. Button-class families and font declarations are TASK-419's, not
 * this lane's; the baseline JSON is keyed by metric name
 * (`{ "styleObjects": { ...per file... } }`) so 419 adds its keys BESIDE,
 * never inside, and any keys it adds are preserved verbatim through this
 * lane's write modes (parse/merge/serialize all carry unknown top-level
 * keys untouched). The scanner's layout leaves that seam and builds
 * nothing for it.
 *
 * THE AUTHORITY SPLIT (decision A): T-383 (tests/design-drift.test.ts)
 * stays the single authority on its four SYNTAX metrics (literal `style={{`
 * blocks, hand-typed colours, styled buttons, `!important`/serif in CSS),
 * measured lexically over all of `src/`. This census's one metric is
 * DISJOINT: object identity per file, over the four operator trees only,
 * measured by AST. The two guards share philosophy (monotone ratchet,
 * fail-closed, deterministic) and the house pattern (scanner lives in its
 * test file), never code (decision B) and never a re-measurement of each
 * other's numbers. One consequence to know when reading both: a
 * custom-props-only object (`style={{ "--cols": "1fr" }}`) is EXEMPT from
 * T-383's block count but COUNTS here -- it is a style object that reaches
 * a `style=` attribute, and the unify lanes still have to retire it.
 *
 * THE FOUR TREES (decision C): `src/app/a`, `src/components/console`,
 * `src/components/studio-overlay`, `src/components/rooms`. The rest of
 * `src/` stays T-383-only visibility (a named seam; the root list is data,
 * so widening later is config, not a rewrite). Nothing under `src/` is
 * touched by this lane; it fixes none of what it counts.
 *
 * WHAT COUNTS -- every object literal REACHING a `style=` attribute, by
 * any path the AST can follow, each counted ONCE per file:
 *   - inline literal:   `style={{ color: "red" }}`
 *   - named const:      `style={wrap}` resolving to a same-file
 *                       `const wrap = { ... }` (the real ground:
 *                       src/components/console/SiteChatCard.tsx's seven
 *                       consts, invisible to T-383's `style={{` count).
 *                       Two references to one const still count once.
 *   - conditional:      `style={cond ? { ... } : undefined}` (the real
 *                       LessonPathView.tsx shape); a branch that cannot be
 *                       an object (`undefined`/`null`/`true`/`false`)
 *                       contributes nothing.
 *   - spread source:    `style={{ ...field, marginBottom: 8 }}` (the real
 *                       src/app/a shape) -- the literal counts AND the
 *                       spread's source object counts, resolved the same
 *                       way as a named const.
 *   - casts/parens unwrap: `style={{ ... } as React.CSSProperties}` counts
 *                       the object once.
 *   Identifier resolution is same-file and scope-honest: the walk climbs
 *   lexical scopes from the use site and takes the nearest variable
 *   declaration (a shadowing local wins over a module const). An object a
 *   `style=` attribute never reaches is not counted at all.
 *
 * THIS IS A RATCHET, NOT AN IDENTITY GUARD (the cut note's ruling 2): an
 * object replaced or grown without changing the file's COUNT passes the
 * check -- true of T-383 too, by design -- and that blind spot is exactly
 * why the baseline also RECORDS, per file, the sorted list of fingerprint
 * names: never asserted, so a replacement shows as a git diff at review
 * time instead of a test flap.
 *
 * FINGERPRINT NAME (decision D): a stable derived name plus the object's
 * sorted top-level property keys, serialized `name[key1,key2]` -- the
 * const's own name for a named object (`wrap[marginBottom]`;
 * alias chains name the const that directly holds the literal),
 * `inline@<line>` for an object literal written at the attribute
 * (repeat collisions on one line get a deterministic `#2`, `#3` suffix in
 * document order), `unresolved@<line>` for the rest. Spread assignments
 * contribute no key to the containing object (their source is its own
 * fingerprint); computed keys record as `[computed]`. The `inline@` line
 * number drifts when a file is edited above the object -- harmless: the
 * names are review data, never asserted.
 *
 * UNRESOLVED -- COUNTED, NEVER GUESSED: a `style=` expression the AST
 * cannot follow to an object literal (a call `style={makeStyle()}`, a
 * member read `style={theme.card}`, an imported const, a loop variable, a
 * reference cycle, a string-literal or bare `style` attribute) lands in
 * `unresolved`, counted in the file's total. Driving that number down is
 * the unify lanes' work; guessing would be a second authority's lie.
 *
 * WHAT THIS GUARD DOES NOT SEE: a style object held in ANOTHER file (a
 * `.ts` helper, an import -- T-383's R10 gap inherited honestly; the use
 * site counts one `unresolved`); a `style` smuggled through a JSX spread
 * attribute (`<div {...rest} />`); everything outside the four trees.
 *
 * DETERMINISTIC, NEVER FLAPS (T-383's R6 inherited): one `ts.createSourceFile`
 * per file (TSX script kind -- `typescript@^5` is already a devDependency;
 * no new dependency, no vendored parser), a sorted file walk, document-order
 * naming, sorted serialization. Same bytes, same census.
 *
 * TWO WRITE MODES, both monotone, mutually exclusive with the normal check
 * in one invocation:
 *   CENSUS_WRITE=init  -- only when tests/operator-census.baseline.json
 *                         does not yet exist; records exactly what it
 *                         measures (count + names per scanned file).
 *   CENSUS_WRITE=1     -- ratchets an EXISTING baseline: every count
 *                         becomes min(old, measured); the recorded names
 *                         follow reality (they are review data, so they
 *                         are rewritten wholesale, never merged); a path
 *                         whose file is gone drops; a brand-new scanned
 *                         file enters at min(measured,
 *                         NEW_FILE_STYLE_OBJECT_ALLOWANCE). If a later
 *                         lane trips this ratchet honestly, that lane's
 *                         gate is where the number moves -- the write is
 *                         theirs, under review, same as T-383.
 * NEW_FILE_STYLE_OBJECT_ALLOWANCE = 3, justified: it mirrors T-383's ruled
 * NEW_FILE_STYLE_ALLOWANCE (the real median of the tree's smallest working
 * files), so a brand-new operator-tree file passing the syntax ratchet at
 * its full allowance of three inline blocks does not automatically trip
 * the census -- but a fourth object, inline or named, needs the
 * review-visible write. It applies ONLY to a path with no baseline record;
 * init recorded every file scanned at lane time, so it can only ever cover
 * files born after this lane.
 *
 * FAIL CLOSED: a missing, unparsable or wrongly-shaped baseline fails; a
 * recorded path whose file vanished fails (a rename is visible either
 * way); a scanned path with no record gets the allowance above, and no
 * more.
 *
 * GATE LINE (K105's lintable, proposed to Number One's oc-gate.sh): the
 * check run prints exactly one line `census: <n> objects, baseline <m>`
 * (n = measured objects across the four trees, m = the baseline's recorded
 * total) -- stable shape, surfaced beside the five gate results.
 *
 * --------------------------------------------------------------------------
 * TASK-419 (block 968,177) -- CENSUS II: METRIC 2 (BUTTON-CLASS FAMILIES)
 * and METRIC 3 (FONT DECLARATIONS), the two censuses Astra carved out of
 * 415 (415's Cut note #:1), added BESIDE metric 1 in this one scanner home
 * and one baseline (419's decision B). 415's styleObjects arm above is
 * untouched; every 419 addition is exactly that -- an addition.
 *
 * METRIC 2 -- WHAT COUNTS: every JSX element (any tag, a component
 * included -- a `<Link className="btn">` carries the dialect too) whose
 * STATICALLY RECOVERABLE className carries a token of one of the five
 * families measured in A-INTAKE §1, checked in an order that keeps them
 * disjoint:
 *   legacy -- token `button` or `btn-pill*`        (globals.css)
 *   kit    -- token `kit-btn*`                     (kit.css)
 *   scar   -- token `scar-*btn*`                   (scar.css)
 *   house  -- token `btn*`                         (house.css)
 *   native -- a `<button>` or an `<a href>` with control semantics and NO
 *             family token (decision C: a recorded family, not an absence
 *             -- the unify program counts it down; the fork's native
 *             buttons are NOT here, they live in the studio repo).
 * "Statically recoverable" is the brief's list and no more: string
 * literals, template-literal static text (the expressions are ignored --
 * `` `btn btn-sm ${on ? "btn-on" : ""}` `` recovers `btn btn-sm`), and
 * simple conditionals / `&&` / `||` / `??` / `+` combinations of those.
 * An identifier, a call, a member read -- `className={helper(...)}` -- is
 * NOT on the list: the element lands in `unresolved`, counted, never
 * guessed (driving that number down is the unify lanes' work). An element
 * carrying several family tokens takes the family of the FIRST matching
 * token in class-string order; every matching token is recorded in the
 * fingerprint keys. A non-control element with a recoverable className and
 * no family token is not counted at all.
 * Fingerprint name `<family>:<tag>@<line>` (`house:button@42[btn,btn-sm]`,
 * `native:a@17`, `unresolved:div@9`) -- RECORDED ONLY, never asserted; the
 * per-file count is asserted monotone, the same ratchet philosophy as
 * metric 1.
 *
 * METRIC 3 -- WHAT COUNTS: the five sheets that reach `/a`, as data
 * (FONT_SHEETS -- READ-ONLY inputs, never edited): globals, scar, house,
 * kit, cartridge under src/app. Each `font-family` / `font` declaration
 * (comments masked first so a commented-out declaration never counts; a
 * `--font-h1: ...` custom-property DEFINITION is not the `font-family`
 * property and never matches) is fingerprinted token-read vs literal
 * (decision D): strip every top-level `var(...)` read with T-383's
 * stripVarCalls philosophy (balanced, nested fallbacks reduce to nothing
 * -- re-implemented here for CSS text, NO code shared with T-383). If only
 * punctuation remains, the declaration was a pure var() read -- TOKEN iff
 * every top-level read names a `--font-*` custom property. ANY other
 * remainder -- a named stack (`ui-monospace, monospace`), a generic tail
 * (`var(--font-roboto), sans-serif`), a size riding a `font:` shorthand, a
 * non-`--font-*` read (`var(--sans, inherit)`) -- is LITERAL. This metric
 * never re-derives serif-or-not: T-383's serif law stays ITS authority
 * (the disjoint-metrics law rides this lane too).
 * Fingerprint name `token:font-family@513[--font-console]` /
 * `literal:font-family@184` -- recorded only, count asserted per sheet.
 *
 * BASELINE SHAPE (Astra's D1, block 968,175): two new TOP-LEVEL keys
 * `buttonFamilies` and `fontDecls` BESIDE `styleObjects`, each keyed by
 * repo-relative forward-slash path exactly as `styleObjects` is, each
 * record the same `{count, names[]}` shape -- NEVER inside a
 * `styleObjects` record.
 *
 * THE WRITE MODE'S ONE NEW MOVE (decision A): a top-level metric key
 * ABSENT from the baseline enters at exactly what the scanner measured
 * (recordsAtMeasured); a key already present min-merges per file and is
 * NEVER raised; a vanished file drops; a new file inside `buttonFamilies`
 * enters at min(measured, NEW_FILE_BUTTON_FAMILY_ALLOWANCE) = 25 --
 * justified: the real tree's largest working file measures 25 button
 * elements at lane time (src/components/console/AdminWeekGrid.tsx), so a
 * new file inside the tree's own proven working range passes and anything
 * beyond the tree's own maximum trips at review. The font sheet set is a
 * fixed five, so `fontDecls` has no new-file case:
 * NEW_FILE_FONT_DECL_ALLOWANCE = 0 -- an unrecorded sheet path fails
 * closed.
 *
 * GATE LINE, EXTENDED (one line, stable shape): the check and write runs
 * print exactly
 *   census: <n> objects, baseline <m> · families: <h>/<k>/<s>/<l>/<nat>/<u> · fonts: <t> token/<l> literal
 * n/m as above; families = measured elements across the four trees in the
 * fixed order house/kit/scar/legacy/native/unresolved; fonts = measured
 * token vs literal declarations across the five sheets.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Fingerprint {
  /** `wrap` / `inline@12` / `unresolved@5` (+ a `#n` suffix on a same-name collision). */
  name: string;
  /** Sorted top-level property keys; empty for an unresolved entry. */
  keys: string[];
}

export interface FileCensus {
  count: number;
  fingerprints: Fingerprint[];
}

/** Measured census, keyed by repo-relative forward-slash path. */
export type Measured = Record<string, FileCensus>;

export interface StyleObjectsRecord {
  /** The asserted number -- monotone, ratchet-only. */
  count: number;
  /** Sorted serialized fingerprint names -- RECORDED ONLY, never asserted. */
  names: string[];
}

export interface CensusBaseline {
  styleObjects: Record<string, StyleObjectsRecord>;
  /** TASK-419 metric 2 -- enters at its measured value (decision A), min-merge only after; absent before the first extended write. */
  buttonFamilies?: Record<string, StyleObjectsRecord>;
  /** TASK-419 metric 3 -- same move as buttonFamilies. */
  fontDecls?: Record<string, StyleObjectsRecord>;
  /** Unknown top-level metric keys ride BESIDE the known ones, preserved verbatim. */
  extraMetrics: Record<string, unknown>;
}

export type CensusViolation =
  | { kind: "count"; file: string; measured: number; baseline: number; examples: string[] }
  | { kind: "missing-file"; file: string }
  | { kind: "family-count"; file: string; measured: number; baseline: number; examples: string[] }
  | { kind: "family-missing-file"; file: string }
  | { kind: "font-count"; file: string; measured: number; baseline: number; examples: string[] }
  | { kind: "font-missing-file"; file: string };

/** TASK-419: the two new arms' measured trees, handed to merge/compare BESIDE the styleObjects measured tree. */
export interface ExtraMeasured {
  buttonFamilies?: Measured;
  fontDecls?: Measured;
}

export type WriteResolution =
  | { mode: "check" }
  | { mode: "init"; error?: string }
  | { mode: "ratchet"; error?: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
export const BASELINE_PATH = path.join(REPO_ROOT, "tests/operator-census.baseline.json");

/** Decision C: the four operator trees, as data -- widening the census is config, not a rewrite. */
export const SCAN_ROOTS = ["src/app/a", "src/components/console", "src/components/studio-overlay", "src/components/rooms"];

/** Ruled above in the docblock: mirrors T-383's NEW_FILE_STYLE_ALLOWANCE; applies only to a path with no record. */
export const NEW_FILE_STYLE_OBJECT_ALLOWANCE = 3;

/** Ruled above in the docblock: the tree's own proven working range (its largest file measures 25 at lane time). */
export const NEW_FILE_BUTTON_FAMILY_ALLOWANCE = 25;

/** The five sheets are a fixed set -- a font-decl path with no record fails closed. */
export const NEW_FILE_FONT_DECL_ALLOWANCE = 0;

/** TASK-419 metric 3's inputs, as data: the five sheets that reach `/a` (READ-ONLY, never edited). */
export const FONT_SHEETS = [
  "src/app/globals.css",
  "src/app/scar.css",
  "src/app/house.css",
  "src/app/kit.css",
  "src/app/cartridge.css",
];

const FAILURE_HEADER = "OPERATOR CENSUS BASELINE EXCEEDED";
const FAILURE_FOOTER =
  "-> fewer, never more: move the styling into a shared class; CENSUS_WRITE=1 belongs to the lane that moves the number, under review.";

// ---------------------------------------------------------------------------
// The scanner -- one ts.createSourceFile per file, TSX script kind
// ---------------------------------------------------------------------------

/** Unwraps the wrappers that never change which object reaches the attribute: parens, as/satisfies/<T> casts, `!`. */
function unwrapExpr(expr: ts.Expression): ts.Expression {
  let e = expr;
  while (
    ts.isParenthesizedExpression(e) ||
    ts.isAsExpression(e) ||
    ts.isSatisfiesExpression(e) ||
    ts.isTypeAssertionExpression(e) ||
    ts.isNonNullExpression(e)
  ) {
    e = e.expression;
  }
  return e;
}

/** A branch that can never be an object literal contributes nothing (the `: undefined` in the real conditional shape). */
function isNoObjectExpression(expr: ts.Expression): boolean {
  return (
    (ts.isIdentifier(expr) && expr.text === "undefined") ||
    expr.kind === ts.SyntaxKind.NullKeyword ||
    expr.kind === ts.SyntaxKind.TrueKeyword ||
    expr.kind === ts.SyntaxKind.FalseKeyword
  );
}

/** Sorted top-level keys of an object literal; spreads contribute no key (their source is its own fingerprint). */
export function objectTopLevelKeys(obj: ts.ObjectLiteralExpression): string[] {
  const keys: string[] = [];
  for (const prop of obj.properties) {
    if (ts.isSpreadAssignment(prop)) continue;
    const name = prop.name;
    if (!name) continue;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) keys.push(name.text);
    else keys.push("[computed]");
  }
  return keys.sort();
}

/** The recorded form of one fingerprint: `wrap[marginBottom]`, `inline@12[color,padding]`, `unresolved@5`. */
export function serializeFingerprint(fp: Fingerprint): string {
  return fp.keys.length > 0 ? `${fp.name}[${fp.keys.join(",")}]` : fp.name;
}

/**
 * Fingerprints every object literal that reaches a `style=` attribute in
 * `sourceText` (one TSX source file). Deterministic: same bytes, same census.
 */
export function scanSource(sourceText: string, fileName = "fixture.tsx"): FileCensus {
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);

  const fingerprints: Fingerprint[] = [];
  const countedObjects = new Set<ts.Node>(); // one object literal counts once, however many attributes reference it
  const usedBaseNames = new Map<string, number>();

  const lineOf = (node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /** Same-name collisions get a deterministic `#2`, `#3` suffix in document order. */
  const claimBaseName = (base: string): string => {
    const seen = usedBaseNames.get(base) ?? 0;
    usedBaseNames.set(base, seen + 1);
    return seen === 0 ? base : `${base}#${seen + 1}`;
  };

  /**
   * Same-file, scope-honest identifier resolution: climb lexical scopes from
   * the use site; the nearest variable declaration of that name wins (a
   * shadowing local beats a module const). Anything not a plain same-file
   * variable declaration -- an import, a parameter, a loop binding -- is
   * null, and the caller records `unresolved`, never a guess.
   */
  const resolveInitializer = (id: ts.Identifier): ts.Expression | null => {
    let scope: ts.Node | undefined = id.parent;
    while (scope) {
      if (ts.isSourceFile(scope) || ts.isBlock(scope) || ts.isModuleBlock(scope)) {
        for (const stmt of scope.statements) {
          if (!ts.isVariableStatement(stmt)) continue;
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === id.text) return decl.initializer ?? null;
          }
        }
      }
      scope = scope.parent;
    }
    return null;
  };

  const addUnresolved = (node: ts.Node): void => {
    fingerprints.push({ name: claimBaseName(`unresolved@${lineOf(node)}`), keys: [] });
  };

  const addObject = (obj: ts.ObjectLiteralExpression, baseName: string): void => {
    if (countedObjects.has(obj)) return;
    countedObjects.add(obj);
    fingerprints.push({ name: claimBaseName(baseName), keys: objectTopLevelKeys(obj) });
    // A spread source travels to the attribute too -- resolve it like any other path.
    for (const prop of obj.properties) {
      if (ts.isSpreadAssignment(prop)) walkExpression(prop.expression, undefined, new Set());
    }
  };

  const walkExpression = (expr: ts.Expression, nameOverride: string | undefined, visited: Set<ts.Node>): void => {
    const e = unwrapExpr(expr);
    if (isNoObjectExpression(e)) return;
    if (ts.isObjectLiteralExpression(e)) {
      addObject(e, nameOverride ?? `inline@${lineOf(e)}`);
      return;
    }
    if (ts.isConditionalExpression(e)) {
      walkExpression(e.whenTrue, undefined, visited);
      walkExpression(e.whenFalse, undefined, visited);
      return;
    }
    if (ts.isBinaryExpression(e)) {
      // `cond && {...}`: only the right side can be the style (a truthy object on the left yields the right).
      if (e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        walkExpression(e.right, undefined, visited);
        return;
      }
      // `a || b` / `a ?? b`: either side can be the object.
      if (e.operatorToken.kind === ts.SyntaxKind.BarBarToken || e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        walkExpression(e.left, undefined, visited);
        walkExpression(e.right, undefined, visited);
        return;
      }
      addUnresolved(e);
      return;
    }
    if (ts.isIdentifier(e)) {
      if (visited.has(e)) {
        addUnresolved(e); // a reference cycle (`const a = b; const b = a;`) -- counted, never guessed, never hangs
        return;
      }
      const init = resolveInitializer(e);
      if (!init) {
        addUnresolved(e);
        return;
      }
      visited.add(e);
      // The const that directly holds the literal names it -- alias chains
      // (`const card = base; style={card}`) resolve to `base`.
      walkExpression(init, e.text, visited);
      return;
    }
    addUnresolved(e);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === "style") {
      const init = node.initializer;
      if (init && ts.isJsxExpression(init) && init.expression) {
        walkExpression(init.expression, undefined, new Set());
      } else {
        // A string-literal (`style="..."`) or bare `style` attribute: no
        // object the AST can fingerprint -- unresolved, counted, never guessed.
        addUnresolved(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { count: fingerprints.length, fingerprints };
}

// ---------------------------------------------------------------------------
// Tree walk -- the four operator roots, plain node:fs, sorted
// ---------------------------------------------------------------------------

/** Recursive `*.tsx` discovery built from `fs.readdirSync` alone (no third-party walker). */
/* Verbatim copy of tests/design-drift.test.ts's listFilesRecursive, kept as a copy on purpose (415's decision B: the two guards share philosophy, never code -- no shared test-helper folder). */
function listFilesRecursive(rootDir: string, extension: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && full.endsWith(extension)) out.push(full);
    }
  }
  return out.sort();
}

/** Scans every `.tsx` under SCAN_ROOTS, keyed by repo-relative forward-slash path, keys sorted. */
export function scanTree(repoRoot: string): Measured {
  const measured: Measured = {};
  for (const root of SCAN_ROOTS) {
    for (const abs of listFilesRecursive(path.join(repoRoot, root), ".tsx")) {
      const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
      measured[rel] = scanSource(fs.readFileSync(abs, "utf8"), rel);
    }
  }
  return Object.fromEntries(Object.keys(measured).sort().map((k) => [k, measured[k]]));
}

// ---------------------------------------------------------------------------
// Metric 2 (TASK-419) -- button-class families, by AST beside the style objects
// ---------------------------------------------------------------------------

export type ButtonFamily = "house" | "kit" | "scar" | "legacy" | "native" | "unresolved";

/** The fixed order the gate line's `families:` segment reports. */
export const FAMILY_LINE_ORDER: readonly ButtonFamily[] = ["house", "kit", "scar", "legacy", "native", "unresolved"];

/**
 * The five families as pure token patterns (A-INTAKE §1), checked in an
 * order that keeps them disjoint: `btn-pill` is legacy, never house.
 */
export function classifyFamilyToken(token: string): Exclude<ButtonFamily, "native" | "unresolved"> | null {
  if (token === "button" || token.startsWith("btn-pill")) return "legacy";
  if (token.startsWith("kit-btn")) return "kit";
  if (token.startsWith("scar-") && token.includes("btn")) return "scar";
  if (token.startsWith("btn")) return "house";
  return null;
}

type ClassRecovery = { kind: "tokens"; tokens: string[] } | { kind: "none" } | { kind: "unresolved" };

function tokensOfStaticText(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Recovers the statically-known class tokens of a className expression --
 * the brief's list and no more: string literals, template-literal static
 * text (expressions ignored), simple conditionals and `&&`/`||`/`??`/`+`
 * combinations of those. An identifier, a call, a member read is NOT on
 * the list: `unresolved`, counted, never guessed.
 */
function recoverClassTokens(expr: ts.Expression): ClassRecovery {
  const e = unwrapExpr(expr);
  if (isNoObjectExpression(e)) return { kind: "none" }; // a `? "btn" : undefined` branch contributes no class
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return { kind: "tokens", tokens: tokensOfStaticText(e.text) };
  if (ts.isTemplateExpression(e)) {
    let text = e.head.text;
    for (const span of e.templateSpans) text += ` ${span.literal.text}`;
    return { kind: "tokens", tokens: tokensOfStaticText(text) };
  }
  if (ts.isConditionalExpression(e)) {
    const t = recoverClassTokens(e.whenTrue);
    const f = recoverClassTokens(e.whenFalse);
    if (t.kind === "unresolved" || f.kind === "unresolved") return { kind: "unresolved" };
    if (t.kind === "tokens" && f.kind === "tokens") return { kind: "tokens", tokens: [...t.tokens, ...f.tokens] };
    return t.kind === "tokens" ? t : f;
  }
  if (ts.isBinaryExpression(e)) {
    if (e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return recoverClassTokens(e.right);
    if (e.operatorToken.kind === ts.SyntaxKind.BarBarToken || e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      const l = recoverClassTokens(e.left);
      const r = recoverClassTokens(e.right);
      if (l.kind === "unresolved" || r.kind === "unresolved") return { kind: "unresolved" };
      if (l.kind === "tokens" && r.kind === "tokens") return { kind: "tokens", tokens: [...l.tokens, ...r.tokens] };
      return l.kind === "tokens" ? l : r;
    }
    if (e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const l = recoverClassTokens(e.left);
      const r = recoverClassTokens(e.right);
      if (l.kind === "tokens" && r.kind === "tokens") return { kind: "tokens", tokens: [...l.tokens, ...r.tokens] };
      return { kind: "unresolved" };
    }
    return { kind: "unresolved" };
  }
  return { kind: "unresolved" };
}

/**
 * Fingerprints every JSX element whose statically-recoverable className
 * carries a family token, plus every control with no family token
 * (`native`) and every element whose className the list above cannot read
 * (`unresolved`). Deterministic: same bytes, same census.
 */
export function scanButtonFamilies(sourceText: string, fileName = "fixture.tsx"): FileCensus {
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);

  const fingerprints: Fingerprint[] = [];
  const usedBaseNames = new Map<string, number>();

  const lineOf = (node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const claimBaseName = (base: string): string => {
    const seen = usedBaseNames.get(base) ?? 0;
    usedBaseNames.set(base, seen + 1);
    return seen === 0 ? base : `${base}#${seen + 1}`;
  };

  const handleElement = (tagName: string, attributes: ts.JsxAttributes, node: ts.Node): void => {
    let recovery: ClassRecovery = { kind: "none" };
    let hasHref = false;
    for (const attr of attributes.properties) {
      if (!ts.isJsxAttribute(attr)) continue; // a spread attribute hides its className -- the documented blind spot
      if (!ts.isIdentifier(attr.name)) continue; // a namespaced attribute name carries no className
      if (attr.name.text === "href") hasHref = true;
      if (attr.name.text !== "className") continue;
      const init = attr.initializer;
      if (init && ts.isStringLiteral(init)) recovery = { kind: "tokens", tokens: tokensOfStaticText(init.text) };
      else if (init && ts.isJsxExpression(init) && init.expression) recovery = recoverClassTokens(init.expression);
    }
    if (recovery.kind === "tokens") {
      const matched = recovery.tokens
        .map((token) => ({ token, family: classifyFamilyToken(token) }))
        .filter((m): m is { token: string; family: NonNullable<ReturnType<typeof classifyFamilyToken>> } => m.family !== null);
      if (matched.length > 0) {
        fingerprints.push({
          name: claimBaseName(`${matched[0].family}:${tagName}@${lineOf(node)}`),
          keys: matched.map((m) => m.token).sort(),
        });
        return;
      }
    }
    if (recovery.kind === "unresolved") {
      fingerprints.push({ name: claimBaseName(`unresolved:${tagName}@${lineOf(node)}`), keys: [] });
      return;
    }
    const isControl = tagName === "button" || (tagName === "a" && hasHref);
    if (isControl) fingerprints.push({ name: claimBaseName(`native:${tagName}@${lineOf(node)}`), keys: [] });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxSelfClosingElement(node)) handleElement(node.tagName.getText(sf), node.attributes, node);
    else if (ts.isJsxOpeningElement(node)) handleElement(node.tagName.getText(sf), node.attributes, node);
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { count: fingerprints.length, fingerprints };
}

/** Scans every `.tsx` under SCAN_ROOTS for metric 2, keyed like scanTree. */
export function scanButtonTree(repoRoot: string): Measured {
  const measured: Measured = {};
  for (const root of SCAN_ROOTS) {
    for (const abs of listFilesRecursive(path.join(repoRoot, root), ".tsx")) {
      const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
      measured[rel] = scanButtonFamilies(fs.readFileSync(abs, "utf8"), rel);
    }
  }
  return Object.fromEntries(Object.keys(measured).sort().map((k) => [k, measured[k]]));
}

// ---------------------------------------------------------------------------
// Metric 3 (TASK-419) -- font declarations, token-read vs literal, per sheet
// ---------------------------------------------------------------------------

/** Masks `/* ... *\/` comments to spaces (newlines kept, so line numbers stay honest). */
function maskCssComments(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      for (let j = i; j < stop; j++) out += css[j] === "\n" ? "\n" : " ";
      i = stop;
      continue;
    }
    out += css[i];
    i++;
  }
  return out;
}

/**
 * T-383's stripVarCalls philosophy, re-implemented for CSS text (NO code
 * shared): every `var(...)` call -- balanced, nested fallbacks included --
 * reduces to a single space, so `var(--font-h1, var(--serif, inherit))`
 * leaves nothing behind.
 */
function stripVarReads(value: string): string {
  let result = "";
  let i = 0;
  while (i < value.length) {
    if (value.startsWith("var(", i)) {
      let depth = 1;
      let j = i + 4;
      while (j < value.length && depth > 0) {
        if (value[j] === "(") depth++;
        else if (value[j] === ")") depth--;
        j++;
      }
      i = j;
      result += " ";
      continue;
    }
    result += value[i];
    i++;
  }
  return result;
}

/** The first-argument names of the TOP-LEVEL `var(...)` reads (a fallback is not a read -- it reduces away with its call). */
function topLevelVarReads(value: string): string[] {
  const reads: string[] = [];
  let i = 0;
  let depth = 0;
  while (i < value.length) {
    if (value.startsWith("var(", i) && depth === 0) {
      let j = i + 4;
      let name = "";
      while (j < value.length && value[j] !== "," && value[j] !== ")") {
        name += value[j];
        j++;
      }
      reads.push(name.trim());
      depth = 1;
      i = j;
      continue;
    }
    if (value[i] === "(") depth++;
    else if (value[i] === ")") depth--;
    i++;
  }
  return reads;
}

/**
 * Decision D: a pure `var(...)` read is TOKEN iff every top-level read
 * names a `--font-*` custom property; ANY other remainder -- a named
 * stack, a generic tail, a shorthand size, a non-`--font-*` read -- is
 * LITERAL.
 */
export function classifyFontDecl(value: string): "token" | "literal" {
  const reads = topLevelVarReads(value);
  const remainder = stripVarReads(value).replace(/[\s,]/g, "");
  if (reads.length > 0 && remainder.length === 0 && reads.every((r) => r.startsWith("--font-"))) return "token";
  return "literal";
}

const FONT_DECL_RE = /\b(font-family|font)\s*:\s*([^;{}]*)/g;

/**
 * Fingerprints every `font-family` / `font` declaration in one sheet as
 * token-read vs literal (comments masked first; a `--font-h1: ...`
 * custom-property definition never matches the property-name pattern).
 */
export function scanFontDecls(cssText: string, fileName = "sheet.css"): FileCensus {
  const masked = maskCssComments(cssText);
  const fingerprints: Fingerprint[] = [];
  const usedBaseNames = new Map<string, number>();
  void fileName; // symmetry with the other scanners; the sheet's path keys the Measured record instead

  const lineOf = (index: number): number => {
    let line = 1;
    for (let i = 0; i < index; i++) if (masked[i] === "\n") line++;
    return line;
  };

  const claimBaseName = (base: string): string => {
    const seen = usedBaseNames.get(base) ?? 0;
    usedBaseNames.set(base, seen + 1);
    return seen === 0 ? base : `${base}#${seen + 1}`;
  };

  const re = new RegExp(FONT_DECL_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    const prop = m[1];
    const value = m[2] ?? "";
    const kind = classifyFontDecl(value);
    fingerprints.push({
      name: claimBaseName(`${kind}:${prop}@${lineOf(m.index)}`),
      keys: kind === "token" ? topLevelVarReads(value).sort() : [],
    });
  }
  return { count: fingerprints.length, fingerprints };
}

/** Scans the five FONT_SHEETS (a vanished sheet counts nothing here -- its baseline record fails closed as missing-file). */
export function scanFontSheets(repoRoot: string): Measured {
  const measured: Measured = {};
  for (const rel of FONT_SHEETS) {
    try {
      measured[rel] = scanFontDecls(fs.readFileSync(path.join(repoRoot, rel), "utf8"), rel);
    } catch {
      continue;
    }
  }
  return Object.fromEntries(Object.keys(measured).sort().map((k) => [k, measured[k]]));
}

// ---------------------------------------------------------------------------
// Baseline: build / merge (write modes) / compare (the ratchet) / parse / serialize
// ---------------------------------------------------------------------------

export function buildInitialBaseline(measured: Measured): CensusBaseline {
  const styleObjects: Record<string, StyleObjectsRecord> = {};
  for (const [file, census] of Object.entries(measured)) {
    styleObjects[file] = { count: census.count, names: census.fingerprints.map(serializeFingerprint).sort() };
  }
  return { styleObjects, extraMetrics: {} };
}

/**
 * Decision A's one new move: a metric key ABSENT from the baseline enters
 * at exactly what the scanner measured (used for `buttonFamilies` and
 * `fontDecls` on their first write, and by `CENSUS_WRITE=init`).
 */
export function recordsAtMeasured(measured: Measured): Record<string, StyleObjectsRecord> {
  const records: Record<string, StyleObjectsRecord> = {};
  for (const [file, census] of Object.entries(measured)) {
    records[file] = { count: census.count, names: census.fingerprints.map(serializeFingerprint).sort() };
  }
  return records;
}

/** Per-file min-merge for one metric key: existing files never rise, a vanished file drops, a new path caps at the allowance; names follow reality. */
function mergeMetricRecords(
  old: Record<string, StyleObjectsRecord>,
  measured: Measured,
  newFileAllowance: number,
): Record<string, StyleObjectsRecord> {
  const records: Record<string, StyleObjectsRecord> = {};
  for (const [file, census] of Object.entries(measured)) {
    const prev = old[file];
    const ceiling = prev ? prev.count : newFileAllowance;
    records[file] = {
      count: Math.min(ceiling, census.count),
      names: census.fingerprints.map(serializeFingerprint).sort(),
    };
  }
  return records;
}

/**
 * The pure min-merge: every count becomes `min(old, measured)`, a vanished
 * file drops, a brand-new path enters at `min(measured, allowance)`. The
 * recorded names follow reality (rewritten wholesale -- they are review
 * data, never asserted). Unknown metric keys ride through untouched.
 * TASK-419 (decision A): an `extra` arm ABSENT from the baseline enters at
 * its measured value (recordsAtMeasured); an arm already present
 * min-merges per file and is never raised; an arm with no measured tree
 * this run carries verbatim. Never raises a number under any input.
 */
export function mergeBaseline(old: CensusBaseline, measured: Measured, extra?: ExtraMeasured): CensusBaseline {
  const styleObjects: Record<string, StyleObjectsRecord> = {};
  for (const [file, census] of Object.entries(measured)) {
    const prev = old.styleObjects[file];
    const ceiling = prev ? prev.count : NEW_FILE_STYLE_OBJECT_ALLOWANCE;
    styleObjects[file] = {
      count: Math.min(ceiling, census.count),
      names: census.fingerprints.map(serializeFingerprint).sort(),
    };
  }
  const next: CensusBaseline = { styleObjects, extraMetrics: old.extraMetrics };
  if (old.buttonFamilies !== undefined) next.buttonFamilies = old.buttonFamilies;
  if (extra?.buttonFamilies !== undefined) {
    next.buttonFamilies =
      old.buttonFamilies === undefined
        ? recordsAtMeasured(extra.buttonFamilies)
        : mergeMetricRecords(old.buttonFamilies, extra.buttonFamilies, NEW_FILE_BUTTON_FAMILY_ALLOWANCE);
  }
  if (old.fontDecls !== undefined) next.fontDecls = old.fontDecls;
  if (extra?.fontDecls !== undefined) {
    next.fontDecls =
      old.fontDecls === undefined ? recordsAtMeasured(extra.fontDecls) : mergeMetricRecords(old.fontDecls, extra.fontDecls, NEW_FILE_FONT_DECL_ALLOWANCE);
  }
  return next;
}

/**
 * The ratchet itself: `measured.count <= baseline.count` per scanned file
 * (an absent record means the new-file allowance, and no more; a recorded
 * file that no longer exists fails closed). The recorded names are NEVER
 * compared here -- ratchet, not identity guard. TASK-419: each `extra` arm
 * ratchets its own key the same way, in its own violation kinds; an arm
 * absent from the baseline ratchets against an empty record (fail closed).
 */
export function compareBaseline(baseline: CensusBaseline, measured: Measured, extra?: ExtraMeasured): CensusViolation[] {
  const violations: CensusViolation[] = [];
  for (const file of Object.keys(measured).sort()) {
    const census = measured[file];
    const rec = baseline.styleObjects[file];
    const limit = rec ? rec.count : NEW_FILE_STYLE_OBJECT_ALLOWANCE;
    if (census.count > limit) {
      violations.push({
        kind: "count",
        file,
        measured: census.count,
        baseline: limit,
        examples: census.fingerprints.map(serializeFingerprint).sort().slice(0, 3),
      });
    }
  }
  for (const file of Object.keys(baseline.styleObjects).sort()) {
    if (!(file in measured)) violations.push({ kind: "missing-file", file });
  }
  const compareArm = (
    records: Record<string, StyleObjectsRecord>,
    arm: Measured,
    allowance: number,
    countKind: "family-count" | "font-count",
    missingKind: "family-missing-file" | "font-missing-file",
  ): void => {
    for (const file of Object.keys(arm).sort()) {
      const census = arm[file];
      const rec = records[file];
      const limit = rec ? rec.count : allowance;
      if (census.count > limit) {
        violations.push({
          kind: countKind,
          file,
          measured: census.count,
          baseline: limit,
          examples: census.fingerprints.map(serializeFingerprint).sort().slice(0, 3),
        });
      }
    }
    for (const file of Object.keys(records).sort()) {
      if (!(file in arm)) violations.push({ kind: missingKind, file });
    }
  };
  if (extra?.buttonFamilies !== undefined) {
    compareArm(baseline.buttonFamilies ?? {}, extra.buttonFamilies, NEW_FILE_BUTTON_FAMILY_ALLOWANCE, "family-count", "family-missing-file");
  }
  if (extra?.fontDecls !== undefined) {
    compareArm(baseline.fontDecls ?? {}, extra.fontDecls, NEW_FILE_FONT_DECL_ALLOWANCE, "font-count", "font-missing-file");
  }
  return violations;
}

export function formatFailureMessage(violations: CensusViolation[]): string {
  const lines: string[] = [FAILURE_HEADER];
  for (const v of violations) {
    if (v.kind === "missing-file" || v.kind === "family-missing-file" || v.kind === "font-missing-file") {
      lines.push(`  ${v.file} -- recorded in the baseline but no longer exists; run write mode to drop it`);
      continue;
    }
    const metric = v.kind === "family-count" ? "buttonFamilies" : v.kind === "font-count" ? "fontDecls" : "styleObjects";
    lines.push(`  ${v.file} -- ${metric}: measured ${v.measured}, baseline ${v.baseline}`);
    if (v.examples.length > 0) {
      lines.push(v.kind === "count" ? "    examples of style objects in this file:" : `    examples of ${metric} in this file:`);
      for (const ex of v.examples) lines.push(`    ${ex}`);
    }
  }
  lines.push(FAILURE_FOOTER);
  return lines.join("\n");
}

/** Pure decision of what an invocation should do, given the env var and whether the file exists. */
export function resolveWriteMode(env: string | undefined, baselineFileExists: boolean): WriteResolution {
  if (env === "init") {
    if (baselineFileExists) {
      return {
        mode: "init",
        error:
          "CENSUS_WRITE=init refuses: tests/operator-census.baseline.json already exists -- use CENSUS_WRITE=1 to ratchet it instead.",
      };
    }
    return { mode: "init" };
  }
  if (env === "1") return { mode: "ratchet" };
  return { mode: "check" };
}

function isStyleObjectsRecord(v: unknown): v is StyleObjectsRecord {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.count === "number" &&
    Number.isInteger(r.count) &&
    r.count >= 0 &&
    Array.isArray(r.names) &&
    r.names.every((n) => typeof n === "string")
  );
}

/** Fail closed on anything that isn't exactly the expected shape; unknown metric keys ride through. */
export function parseBaseline(raw: string): CensusBaseline {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("OPERATOR CENSUS: tests/operator-census.baseline.json is not valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("OPERATOR CENSUS: tests/operator-census.baseline.json is not a JSON object.");
  }
  const obj = data as Record<string, unknown>;
  if (!obj.styleObjects || typeof obj.styleObjects !== "object" || Array.isArray(obj.styleObjects)) {
    throw new Error('OPERATOR CENSUS: tests/operator-census.baseline.json is missing a valid "styleObjects" object.');
  }
  const styleObjects: Record<string, StyleObjectsRecord> = {};
  for (const [file, rec] of Object.entries(obj.styleObjects as Record<string, unknown>)) {
    if (!isStyleObjectsRecord(rec)) {
      throw new Error(`OPERATOR CENSUS: tests/operator-census.baseline.json's styleObjects record for "${file}" is wrongly shaped.`);
    }
    styleObjects[file] = { count: rec.count, names: [...rec.names] };
  }
  const baseline: CensusBaseline = { styleObjects, extraMetrics: {} };
  for (const key of ["buttonFamilies", "fontDecls"] as const) {
    const rawKey = obj[key];
    if (rawKey === undefined) continue; // absent before the first extended write -- the check arm fails closed against an empty record
    if (!rawKey || typeof rawKey !== "object" || Array.isArray(rawKey)) {
      throw new Error(`OPERATOR CENSUS: tests/operator-census.baseline.json's "${key}" is not an object.`);
    }
    const records: Record<string, StyleObjectsRecord> = {};
    for (const [file, rec] of Object.entries(rawKey as Record<string, unknown>)) {
      if (!isStyleObjectsRecord(rec)) {
        throw new Error(`OPERATOR CENSUS: tests/operator-census.baseline.json's ${key} record for "${file}" is wrongly shaped.`);
      }
      records[file] = { count: rec.count, names: [...rec.names] };
    }
    baseline[key] = records;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k !== "styleObjects" && k !== "buttonFamilies" && k !== "fontDecls") baseline.extraMetrics[k] = v;
  }
  return baseline;
}

/** Stable output: styleObjects first, then the known 419 keys, then extra metric keys sorted; file keys sorted, two-space indent, trailing newline, no timestamps, no sha. */
export function serializeBaseline(baseline: CensusBaseline): string {
  const sortRecord = <T,>(rec: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.keys(rec).sort().map((k) => [k, rec[k]]));
  const stable: Record<string, unknown> = { styleObjects: sortRecord(baseline.styleObjects) };
  if (baseline.buttonFamilies !== undefined) stable.buttonFamilies = sortRecord(baseline.buttonFamilies);
  if (baseline.fontDecls !== undefined) stable.fontDecls = sortRecord(baseline.fontDecls);
  for (const k of Object.keys(baseline.extraMetrics).sort()) stable[k] = baseline.extraMetrics[k];
  return `${JSON.stringify(stable, null, 2)}\n`;
}

export function totalObjects(measured: Measured): number {
  return Object.values(measured).reduce((sum, c) => sum + c.count, 0);
}

export function totalBaseline(baseline: CensusBaseline): number {
  return Object.values(baseline.styleObjects).reduce((sum, r) => sum + r.count, 0);
}

/** TASK-419: measured family totals across the four trees, keyed by family (the fingerprint name's prefix before `:`). */
export function familyTotals(measured: Measured): Record<ButtonFamily, number> {
  const totals: Record<ButtonFamily, number> = { house: 0, kit: 0, scar: 0, legacy: 0, native: 0, unresolved: 0 };
  for (const census of Object.values(measured)) {
    for (const fp of census.fingerprints) {
      const family = fp.name.slice(0, fp.name.indexOf(":")) as ButtonFamily;
      if (family in totals) totals[family]++;
    }
  }
  return totals;
}

/** TASK-419: measured token vs literal declaration totals across the five sheets. */
export function fontDeclTotals(measured: Measured): { token: number; literal: number } {
  let token = 0;
  let literal = 0;
  for (const census of Object.values(measured)) {
    for (const fp of census.fingerprints) {
      if (fp.name.startsWith("token:")) token++;
      else if (fp.name.startsWith("literal:")) literal++;
    }
  }
  return { token, literal };
}

/**
 * The one-line gate output (shape ruled in the docblock): objects and
 * baseline from metric 1, measured family totals in FAMILY_LINE_ORDER,
 * measured token/literal font totals.
 */
export function censusGateLine(measured: Measured, baseline: CensusBaseline, families: Measured, fonts: Measured): string {
  const f = familyTotals(families);
  const d = fontDeclTotals(fonts);
  return (
    `census: ${totalObjects(measured)} objects, baseline ${totalBaseline(baseline)} · ` +
    `families: ${FAMILY_LINE_ORDER.map((family) => f[family]).join("/")} · ` +
    `fonts: ${d.token} token/${d.literal} literal`
  );
}

// ===========================================================================
// Unit tests
// ===========================================================================

describe("scanSource -- the four travel paths, each fingerprinted once", () => {
  it("an inline literal counts once, named by its line, keys sorted", () => {
    const src = 'const el = <div style={{ padding: 4, color: "red" }} />;';
    const census = scanSource(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["inline@1[color,padding]"]);
  });

  it("a named const referenced as style={ident} counts once, named by the const (SiteChatCard.tsx's real shape)", () => {
    const src =
      'const wrap: React.CSSProperties = { marginBottom: 12 };\n' +
      "export function Card() {\n" +
      "  return <section style={wrap}><div style={wrap}>x</div></section>;\n" +
      "}\n";
    const census = scanSource(src);
    expect(census.count).toBe(1); // two references, one object
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["wrap[marginBottom]"]);
  });

  it("a conditional's object branch counts; the undefined branch adds nothing (LessonPathView.tsx's real shape)", () => {
    const src = "const el = <div style={resources.length > 0 ? { marginTop: 20 } : undefined}>x</div>;";
    const census = scanSource(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["inline@1[marginTop]"]);
  });

  it("a spread source counts beside the literal that spreads it (src/app/a's real style={{ ...field shape)", () => {
    const src =
      'const field = { width: "100%", boxSizing: "border-box" };\n' +
      "const el = <input style={{ ...field, marginBottom: 8 }} />;\n";
    const census = scanSource(src);
    expect(census.count).toBe(2);
    expect(census.fingerprints.map(serializeFingerprint).sort()).toEqual(["field[boxSizing,width]", "inline@2[marginBottom]"]);
  });

  it("a cast after the object unwraps, and a custom-props-only object COUNTS (disjoint from T-383's exemption)", () => {
    const src = 'const el = <div style={{ "--cols": "1fr" } as React.CSSProperties}>x</div>;';
    const census = scanSource(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["inline@1[--cols]"]);
  });

  it("an object no style= attribute reaches is not counted at all", () => {
    const src = 'const orphan = { a: 1 };\nconst el = <div style={{ b: 2 }} />;';
    expect(scanSource(src).count).toBe(1);
  });

  it("an alias chain names the const that directly holds the literal", () => {
    const src = "const base = { margin: 0 };\nconst card = base;\nconst el = <div style={card} />;";
    const census = scanSource(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["base[margin]"]);
  });

  it("a shadowing local wins over a module const of the same name (scope-honest resolution)", () => {
    const src =
      'const s = { color: "red" };\n' +
      "function C() {\n" +
      "  const s = { padding: 1 };\n" +
      "  return <div style={s} />;\n" +
      "}\n";
    const census = scanSource(src);
    expect(census.count).toBe(1); // the module-level s is never reached by a style= attribute
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["s[padding]"]);
  });

  it("two objects on one line get distinct deterministic names", () => {
    const src = "const el = <div style={c ? { a: 1 } : { b: 2 }} />;";
    const census = scanSource(src);
    expect(census.count).toBe(2);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["inline@1[a]", "inline@1#2[b]"]);
  });

  it("style={undefined} contributes nothing -- no object, no unresolved", () => {
    expect(scanSource("const el = <div style={undefined} />;").count).toBe(0);
  });

  it("a && guard's right side counts; the condition does not", () => {
    const src = 'const el = <div style={open && { display: "block" }} />;';
    const census = scanSource(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["inline@1[display]"]);
  });
});

describe("scanSource -- unresolved: counted, never guessed", () => {
  it("a call expression lands in unresolved", () => {
    const census = scanSource("const el = <div style={makeStyle(row)} />;");
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["unresolved@1"]);
  });

  it("a member read lands in unresolved", () => {
    const census = scanSource("const el = <div style={theme.card} />;");
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["unresolved@1"]);
  });

  it("an imported const lands in unresolved (the cross-file gap, inherited honestly from R10)", () => {
    const census = scanSource('import { card } from "./styles";\nconst el = <div style={card} />;');
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["unresolved@2"]);
  });

  it("a reference cycle lands in unresolved and never hangs", () => {
    const census = scanSource("const a = b;\nconst b = a;\nconst el = <div style={a} />;");
    expect(census.count).toBe(1);
    expect(census.fingerprints[0].name).toMatch(/^unresolved@/);
  });
});

describe("ratchet, not identity -- the cut note's ruling 2, asserted as such", () => {
  it("a renamed object changes the recorded names but not the count -- and the check PASSES", () => {
    const before = 'const wrap = { color: "red" };\nconst el = <div style={wrap} />;';
    const after = 'const frame = { color: "red" };\nconst el = <div style={frame} />;';
    const baseline = buildInitialBaseline({ "src/x.tsx": scanSource(before) });
    const measured = { "src/x.tsx": scanSource(after) };
    expect(compareBaseline(baseline, measured)).toHaveLength(0); // the blind spot, by design
    expect(baseline.styleObjects["src/x.tsx"].names).toEqual(["wrap[color]"]);
    // ...and the replacement is visible as a git diff of the recorded names at review time
    expect(measured["src/x.tsx"].fingerprints.map(serializeFingerprint)).toEqual(["frame[color]"]);
  });

  it("a grown object keeps the count and passes -- the names record the growth", () => {
    const before = 'const wrap = { color: "red" };\nconst el = <div style={wrap} />;';
    const after = 'const wrap = { color: "red", padding: 2 };\nconst el = <div style={wrap} />;';
    const baseline = buildInitialBaseline({ "src/x.tsx": scanSource(before) });
    const measured = { "src/x.tsx": scanSource(after) };
    expect(compareBaseline(baseline, measured)).toHaveLength(0);
    expect(measured["src/x.tsx"].fingerprints.map(serializeFingerprint)).toEqual(["wrap[color,padding]"]);
  });
});

describe("mergeBaseline -- the min-merge never raises a number", () => {
  it("keeps the lower of the old count and the freshly measured count", () => {
    const old = buildInitialBaseline({ "a.tsx": { count: 1, fingerprints: [{ name: "wrap", keys: ["color"] }] } });
    const measured: Measured = { "a.tsx": { count: 9, fingerprints: [] } };
    expect(mergeBaseline(old, measured).styleObjects["a.tsx"].count).toBe(1);
  });

  it("drops a recorded file that no longer exists in the tree", () => {
    const old = buildInitialBaseline({ "gone.tsx": { count: 2, fingerprints: [] } });
    expect(mergeBaseline(old, {}).styleObjects["gone.tsx"]).toBeUndefined();
  });

  it("a brand-new scanned file enters at min(measured, allowance)", () => {
    const old = buildInitialBaseline({});
    const big: Measured = { "new.tsx": { count: 9, fingerprints: [{ name: "x", keys: [] }] } };
    expect(mergeBaseline(old, big).styleObjects["new.tsx"].count).toBe(NEW_FILE_STYLE_OBJECT_ALLOWANCE);
    const small: Measured = { "new.tsx": { count: 2, fingerprints: [] } };
    expect(mergeBaseline(old, small).styleObjects["new.tsx"].count).toBe(2);
  });

  it("the recorded names follow reality (rewritten wholesale, never merged, never asserted)", () => {
    const old = buildInitialBaseline({ "a.tsx": { count: 5, fingerprints: [{ name: "oldName", keys: ["x"] }] } });
    const measured: Measured = { "a.tsx": { count: 3, fingerprints: [{ name: "newName", keys: ["y"] }] } };
    const merged = mergeBaseline(old, measured);
    expect(merged.styleObjects["a.tsx"]).toEqual({ count: 3, names: ["newName[y]"] });
  });

  it("an unknown metric key rides BESIDE styleObjects through merge and serialize (the TASK-419 seam)", () => {
    const raw = '{"styleObjects":{"a.tsx":{"count":1,"names":[]}},"buttonElements":{"a.tsx":{"count":4,"names":["kit-btn"]}}}';
    const parsed = parseBaseline(raw);
    const merged = mergeBaseline(parsed, { "a.tsx": { count: 1, fingerprints: [] } });
    const out = serializeBaseline(merged);
    expect(JSON.parse(out)).toEqual(JSON.parse(raw));
    expect(out.indexOf('"styleObjects"')).toBeLessThan(out.indexOf('"buttonElements"'));
  });
});

describe("compareBaseline -- the ratchet bites on a scratch fixture (never a real src/ file)", () => {
  const oneObject = 'const el = <div style={{ color: "red" }} />;';
  const twoObjects = 'const el = <div style={{ color: "red" }} /><span style={{ padding: 1 }} />;';

  it("an added object trips the check with the right numbers", () => {
    const baseline = buildInitialBaseline({ "src/fixture.tsx": scanSource(oneObject) });
    const violations = compareBaseline(baseline, { "src/fixture.tsx": scanSource(twoObjects) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ kind: "count", file: "src/fixture.tsx", measured: 2, baseline: 1 });
    const message = formatFailureMessage(violations);
    expect(message).toContain("OPERATOR CENSUS BASELINE EXCEEDED");
    expect(message).toContain("src/fixture.tsx -- styleObjects: measured 2, baseline 1");
    expect(message).toContain("fewer, never more");
  });

  it("an equal count passes", () => {
    const baseline = buildInitialBaseline({ "src/fixture.tsx": scanSource(oneObject) });
    expect(compareBaseline(baseline, { "src/fixture.tsx": scanSource(oneObject) })).toHaveLength(0);
  });

  it("a scanned file with no record passes inside the allowance and fails past it", () => {
    const baseline = buildInitialBaseline({});
    expect(compareBaseline(baseline, { "src/new.tsx": scanSource(twoObjects) })).toHaveLength(0);
    const four = "const a=<div style={{a:1}}/><b style={{b:1}}/><c style={{c:1}}/><d style={{d:1}}/>;";
    const violations = compareBaseline(baseline, { "src/new.tsx": scanSource(four) });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ kind: "count", measured: 4, baseline: NEW_FILE_STYLE_OBJECT_ALLOWANCE });
  });

  it("a recorded file that vanished fails closed", () => {
    const baseline = buildInitialBaseline({ "src/gone.tsx": { count: 0, fingerprints: [] } });
    expect(compareBaseline(baseline, {})).toEqual([{ kind: "missing-file", file: "src/gone.tsx" }]);
  });
});

describe("parseBaseline -- fail closed on anything but the right shape", () => {
  it("throws on invalid JSON", () => {
    expect(() => parseBaseline("{not json")).toThrow(/not valid JSON/);
  });

  it("throws when styleObjects is missing or not an object", () => {
    expect(() => parseBaseline("{}")).toThrow(/"styleObjects"/);
    expect(() => parseBaseline('{"styleObjects":[]}')).toThrow(/"styleObjects"/);
  });

  it("throws on a mis-shaped record", () => {
    expect(() => parseBaseline('{"styleObjects":{"a.tsx":{"count":"nope","names":[]}}}')).toThrow(/wrongly shaped/);
    expect(() => parseBaseline('{"styleObjects":{"a.tsx":{"count":1,"names":[7]}}}')).toThrow(/wrongly shaped/);
  });

  it("round-trips a well-formed file", () => {
    const baseline = buildInitialBaseline({ "a.tsx": { count: 2, fingerprints: [{ name: "wrap", keys: ["color"] }] } });
    expect(parseBaseline(serializeBaseline(baseline))).toEqual(baseline);
  });
});

describe("resolveWriteMode -- pure, no file IO", () => {
  it("defaults to check mode with no env var set", () => {
    expect(resolveWriteMode(undefined, true)).toEqual({ mode: "check" });
    expect(resolveWriteMode(undefined, false)).toEqual({ mode: "check" });
  });

  it("init is allowed only when the baseline does not yet exist, and refuses in words when it does", () => {
    expect(resolveWriteMode("init", false)).toEqual({ mode: "init" });
    const refused = resolveWriteMode("init", true);
    expect(refused.mode).toBe("init");
    expect((refused as { error?: string }).error).toMatch(/already exists/);
  });

  it("WRITE=1 resolves to ratchet mode regardless of prior existence", () => {
    expect(resolveWriteMode("1", true)).toEqual({ mode: "ratchet" });
    expect(resolveWriteMode("1", false)).toEqual({ mode: "ratchet" });
  });
});

describe("serializeBaseline -- stable output", () => {
  it("sorts file keys and ends with a newline", () => {
    const baseline: CensusBaseline = {
      styleObjects: {
        "b.tsx": { count: 1, names: [] },
        "a.tsx": { count: 2, names: [] },
      },
      extraMetrics: {},
    };
    const json = serializeBaseline(baseline);
    expect(json.indexOf('"a.tsx"')).toBeLessThan(json.indexOf('"b.tsx"'));
    expect(json.endsWith("\n")).toBe(true);
  });
});

// ===========================================================================
// TASK-419 unit tests -- metric 2 (button-class families) and metric 3
// (font declarations): scratch fixture sources only, never a real src/ file.
// ===========================================================================

describe("classifyFamilyToken -- the five families, disjoint (A-INTAKE §1)", () => {
  it("legacy: `button` and `btn-pill*` (globals.css)", () => {
    expect(classifyFamilyToken("button")).toBe("legacy");
    expect(classifyFamilyToken("btn-pill")).toBe("legacy");
    expect(classifyFamilyToken("btn-pill--solid")).toBe("legacy");
  });

  it("house: `btn*` -- but never `btn-pill*` (checked in disjoint order)", () => {
    expect(classifyFamilyToken("btn")).toBe("house");
    expect(classifyFamilyToken("btn-sm")).toBe("house");
    expect(classifyFamilyToken("btn-ghost")).toBe("house");
  });

  it("kit and scar: `kit-btn*` and `scar-*btn*`", () => {
    expect(classifyFamilyToken("kit-btn")).toBe("kit");
    expect(classifyFamilyToken("kit-btn--lg")).toBe("kit");
    expect(classifyFamilyToken("scar-railbtn")).toBe("scar");
    expect(classifyFamilyToken("scar-railsubbtn--soon")).toBe("scar");
  });

  it("everything else is no family token", () => {
    expect(classifyFamilyToken("card")).toBeNull();
    expect(classifyFamilyToken("font-body")).toBeNull();
    expect(classifyFamilyToken("scar-panel")).toBeNull(); // scar-, but no btn
    expect(classifyFamilyToken("text-sm")).toBeNull();
  });
});

describe("scanButtonFamilies -- the five families, each classified per element", () => {
  it("a string-literal className classifies by its first family token in class order", () => {
    const census = scanButtonFamilies('const el = <button className="btn btn-sm">Save</button>;');
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["house:button@1[btn,btn-sm]"]);
  });

  it("legacy `btn-pill` on an anchor; a component carrying the dialect counts too", () => {
    const src = 'const a = <a href="/x" className="btn-pill btn-pill--muted">go</a>;\nconst b = <Link href="/y" className="btn">y</Link>;';
    const census = scanButtonFamilies(src);
    expect(census.count).toBe(2);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["legacy:a@1[btn-pill,btn-pill--muted]", "house:Link@2[btn]"]);
  });

  it("template-literal static text recovers; the expressions are ignored (the real `btn btn-sm ${...}` shape)", () => {
    const src = 'const el = <button className={`btn btn-sm ${kind === "x" ? "btn-on" : "btn-ghost"}`}>x</button>;';
    const census = scanButtonFamilies(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["house:button@1[btn,btn-sm]"]);
  });

  it("a scar token in a template's static head classifies scar", () => {
    const src = 'const el = <button className={`scar-railbtn ${soon ? "scar-railbtn--soon" : ""}`}>r</button>;';
    const census = scanButtonFamilies(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["scar:button@1[scar-railbtn]"]);
  });

  it("a simple conditional unions both branches; the first matching token names the family", () => {
    const src = 'const el = <button className={pill ? "btn-pill" : "btn"}>x</button>;';
    const census = scanButtonFamilies(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["legacy:button@1[btn,btn-pill]"]);
  });

  it("several family tokens on one element: first in class order wins, all are recorded", () => {
    const census = scanButtonFamilies('const el = <button className="btn-pill btn">x</button>;');
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["legacy:button@1[btn,btn-pill]"]);
  });

  it("a non-control element with a recoverable className and no family token is not counted", () => {
    expect(scanButtonFamilies('const el = <div className="card mt-2">x</div>;').count).toBe(0);
  });
});

describe("scanButtonFamilies -- native is a recorded family, not an absence (decision C)", () => {
  it("a <button> with no className counts native", () => {
    const census = scanButtonFamilies("const el = <button>Save</button>;");
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["native:button@1"]);
  });

  it("an <a href> with a recoverable non-family className counts native; an <a> without href is not a control", () => {
    const src = 'const a = <a href="/x" className="card">go</a>;\nconst b = <a className="card">plain</a>;';
    const census = scanButtonFamilies(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["native:a@1"]);
  });
});

describe("scanButtonFamilies -- unresolved: counted, never guessed", () => {
  it("a call expression lands in unresolved", () => {
    const census = scanButtonFamilies("const el = <button className={makeCls(row)}>x</button>;");
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["unresolved:button@1"]);
  });

  it("an identifier is NOT on the brief's recoverable list -- unresolved even for a same-file const", () => {
    const src = 'const cls = "btn";\nconst el = <button className={cls}>x</button>;';
    const census = scanButtonFamilies(src);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["unresolved:button@2"]);
  });

  it("a member read lands in unresolved; a conditional with an unrecoverable branch too", () => {
    const src = 'const a = <div className={styles.btn}>x</div>;\nconst b = <div className={on ? "btn" : makeCls()}>y</div>;';
    const census = scanButtonFamilies(src);
    expect(census.count).toBe(2);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["unresolved:div@1", "unresolved:div@2"]);
  });
});

describe("classifyFontDecl -- token-read vs literal (decision D, the var()-fallback strip)", () => {
  it("a pure var(--font-*) read is token; nested fallbacks reduce to nothing", () => {
    expect(classifyFontDecl(" var(--font-console)")).toBe("token");
    expect(classifyFontDecl(" var(--font-h1, var(--serif, inherit))")).toBe("token");
  });

  it("a named stack or a generic keyword is literal", () => {
    expect(classifyFontDecl(" ui-monospace, monospace")).toBe("literal");
    expect(classifyFontDecl("inherit")).toBe("literal");
    expect(classifyFontDecl("'Open Sans',-apple-system,sans-serif")).toBe("literal");
  });

  it("a token read with a literal tail is literal -- the tail is a remainder, not a fallback", () => {
    expect(classifyFontDecl(" var(--font-roboto), sans-serif")).toBe("literal");
    expect(classifyFontDecl("var(--font-open-sans),'Open Sans',-apple-system,'Segoe UI',sans-serif")).toBe("literal");
  });

  it("a non-`--font-*` read is literal even when pure (`--sans`/`--serif`/`--disp` are the sheets' own dialect)", () => {
    expect(classifyFontDecl(" var(--sans, inherit)")).toBe("literal");
    expect(classifyFontDecl("var(--serif)")).toBe("literal");
  });

  it("a `font:` shorthand riding a size is literal (the size is a remainder)", () => {
    expect(classifyFontDecl(" 12px/1.2 var(--font-pixel)")).toBe("literal");
  });
});

describe("scanFontDecls -- per declaration, comments masked, custom-property definitions never match", () => {
  it("fingerprints each declaration with its kind, property and honest line", () => {
    const css = "a { font-family: var(--font-console); }\n\nb { font-family: ui-monospace, monospace; }";
    const census = scanFontDecls(css);
    expect(census.count).toBe(2);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["token:font-family@1[--font-console]", "literal:font-family@3"]);
  });

  it("a commented-out declaration never counts, and the lines below keep their numbers", () => {
    const css = "/*\nfont-family: serif;\n*/\na { font-family: var(--font-pixel); }";
    const census = scanFontDecls(css);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["token:font-family@4[--font-pixel]"]);
  });

  it("a `--font-h1: ...` custom-property DEFINITION is not a font declaration", () => {
    const css = ":root { --font-h1:'Barlow',sans-serif; }\nh1 { font-family: var(--font-h1); }";
    const census = scanFontDecls(css);
    expect(census.count).toBe(1);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["token:font-family@2[--font-h1]"]);
  });

  it("two declarations of one kind on one line get distinct deterministic names", () => {
    const css = "a{font-family:var(--font-pixel)}b{font-family:var(--font-console)}";
    const census = scanFontDecls(css);
    expect(census.count).toBe(2);
    expect(census.fingerprints.map(serializeFingerprint)).toEqual(["token:font-family@1[--font-pixel]", "token:font-family@1#2[--font-console]"]);
  });
});

describe("mergeBaseline -- the 419 arms: a NEW key at its measured value, an existing key never raised (decision A)", () => {
  const families: Measured = { "a.tsx": { count: 4, fingerprints: [{ name: "house:button@1", keys: ["btn"] }] } };
  const fonts: Measured = { "src/app/kit.css": { count: 2, fingerprints: [{ name: "token:font-family@1", keys: ["--font-h1"] }] } };

  it("a key absent from the baseline enters at exactly the measured value", () => {
    const old = buildInitialBaseline({ "a.tsx": { count: 1, fingerprints: [] } });
    const merged = mergeBaseline(old, { "a.tsx": { count: 1, fingerprints: [] } }, { buttonFamilies: families, fontDecls: fonts });
    expect(merged.buttonFamilies).toEqual({ "a.tsx": { count: 4, names: ["house:button@1[btn]"] } });
    expect(merged.fontDecls).toEqual({ "src/app/kit.css": { count: 2, names: ["token:font-family@1[--font-h1]"] } });
  });

  it("an existing key min-merges per file and is NEVER raised", () => {
    const old: CensusBaseline = {
      styleObjects: {},
      buttonFamilies: { "a.tsx": { count: 2, names: ["old"] } },
      fontDecls: { "src/app/kit.css": { count: 5, names: [] } },
      extraMetrics: {},
    };
    const merged = mergeBaseline(old, {}, { buttonFamilies: families, fontDecls: fonts });
    expect(merged.buttonFamilies?.["a.tsx"].count).toBe(2); // measured 4, recorded 2 -- never raised
    expect(merged.fontDecls?.["src/app/kit.css"].count).toBe(2); // min(5, 2) follows reality down
    expect(merged.buttonFamilies?.["a.tsx"].names).toEqual(["house:button@1[btn]"]); // names rewritten wholesale
  });

  it("a new file inside an existing key caps at the allowance; a vanished file drops", () => {
    const old: CensusBaseline = {
      styleObjects: {},
      buttonFamilies: { "gone.tsx": { count: 1, names: [] } },
      fontDecls: { "src/app/gone.css": { count: 1, names: [] } },
      extraMetrics: {},
    };
    const big: Measured = { "new.tsx": { count: 99, fingerprints: [] } };
    const merged = mergeBaseline(old, {}, { buttonFamilies: big, fontDecls: fonts });
    expect(merged.buttonFamilies?.["gone.tsx"]).toBeUndefined();
    expect(merged.buttonFamilies?.["new.tsx"].count).toBe(NEW_FILE_BUTTON_FAMILY_ALLOWANCE);
    expect(merged.fontDecls?.["src/app/gone.css"]).toBeUndefined();
  });

  it("an arm with no measured tree this run carries verbatim", () => {
    const old: CensusBaseline = {
      styleObjects: {},
      buttonFamilies: { "a.tsx": { count: 2, names: ["keep"] } },
      extraMetrics: {},
    };
    const merged = mergeBaseline(old, {});
    expect(merged.buttonFamilies).toEqual({ "a.tsx": { count: 2, names: ["keep"] } });
  });
});

describe("compareBaseline -- the 419 ratchet arms bite on scratch fixtures (never a real src/ file)", () => {
  const one = 'const el = <button className="btn">x</button>;';
  const two = 'const a = <button className="btn">x</button>;\nconst b = <button className="btn-pill">y</button>;';

  it("an added family element trips with the right numbers", () => {
    const baseline: CensusBaseline = {
      styleObjects: {},
      buttonFamilies: { "src/fixture.tsx": { count: 1, names: ["house:button@1[btn]"] } },
      extraMetrics: {},
    };
    const violations = compareBaseline(baseline, {}, { buttonFamilies: { "src/fixture.tsx": scanButtonFamilies(two) } });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ kind: "family-count", file: "src/fixture.tsx", measured: 2, baseline: 1 });
    const message = formatFailureMessage(violations);
    expect(message).toContain("src/fixture.tsx -- buttonFamilies: measured 2, baseline 1");
    expect(message).toContain("fewer, never more");
  });

  it("an equal family census passes; a recorded file that vanished fails closed", () => {
    const baseline: CensusBaseline = {
      styleObjects: {},
      buttonFamilies: { "src/fixture.tsx": { count: 1, names: [] } },
      extraMetrics: {},
    };
    expect(compareBaseline(baseline, {}, { buttonFamilies: { "src/fixture.tsx": scanButtonFamilies(one) } })).toHaveLength(0);
    expect(compareBaseline(baseline, {}, { buttonFamilies: {} })).toEqual([{ kind: "family-missing-file", file: "src/fixture.tsx" }]);
  });

  it("a key absent from the baseline fails closed -- every measured file ratchets against the allowance", () => {
    const baseline = buildInitialBaseline({});
    const violations = compareBaseline(baseline, {}, { fontDecls: { "src/app/kit.css": scanFontDecls("a{font-family:monospace}") } });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ kind: "font-count", measured: 1, baseline: NEW_FILE_FONT_DECL_ALLOWANCE });
  });

  it("no extra arms, no new violations -- 415's two-argument call is untouched", () => {
    const baseline = buildInitialBaseline({ "a.tsx": { count: 1, fingerprints: [] } });
    expect(compareBaseline(baseline, { "a.tsx": { count: 1, fingerprints: [] } })).toHaveLength(0);
  });
});

describe("parseBaseline -- the 419 keys are known: validated when present, absent means not yet written", () => {
  it("round-trips the two new keys beside styleObjects", () => {
    const baseline: CensusBaseline = {
      styleObjects: { "a.tsx": { count: 1, names: [] } },
      buttonFamilies: { "a.tsx": { count: 4, names: ["house:button@1[btn]"] } },
      fontDecls: { "src/app/kit.css": { count: 2, names: [] } },
      extraMetrics: { futureMetric: { "a.tsx": 1 } },
    };
    expect(parseBaseline(serializeBaseline(baseline))).toEqual(baseline);
    const out = serializeBaseline(parseBaseline(serializeBaseline(baseline)));
    expect(out.indexOf('"styleObjects"')).toBeLessThan(out.indexOf('"buttonFamilies"'));
    expect(out.indexOf('"buttonFamilies"')).toBeLessThan(out.indexOf('"fontDecls"'));
    expect(out.indexOf('"fontDecls"')).toBeLessThan(out.indexOf('"futureMetric"'));
  });

  it("throws on a wrongly-shaped 419 record, in words", () => {
    expect(() => parseBaseline('{"styleObjects":{},"buttonFamilies":{"a.tsx":{"count":"nope","names":[]}}}')).toThrow(/wrongly shaped/);
    expect(() => parseBaseline('{"styleObjects":{},"fontDecls":[]}')).toThrow(/"fontDecls" is not an object/);
  });
});

describe("censusGateLine -- the one-line output, stable shape", () => {
  it("reads objects AND families AND fonts, in the ruled order", () => {
    const measured: Measured = { "a.tsx": { count: 2, fingerprints: [] } };
    const baseline = buildInitialBaseline(measured);
    const families: Measured = {
      "a.tsx": {
        count: 4,
        fingerprints: [
          { name: "house:button@1", keys: ["btn"] },
          { name: "kit:button@2", keys: ["kit-btn"] },
          { name: "scar:button@3", keys: ["scar-railbtn"] },
          { name: "legacy:a@4", keys: ["btn-pill"] },
        ],
      },
      "b.tsx": { count: 2, fingerprints: [{ name: "native:button@1", keys: [] }, { name: "unresolved:div@9", keys: [] }] },
    };
    const fonts: Measured = {
      "src/app/kit.css": {
        count: 3,
        fingerprints: [
          { name: "token:font-family@1", keys: ["--font-h1"] },
          { name: "token:font-family@2", keys: ["--font-h2"] },
          { name: "literal:font-family@3", keys: [] },
        ],
      },
    };
    expect(censusGateLine(measured, baseline, families, fonts)).toBe(
      "census: 2 objects, baseline 2 · families: 1/1/1/1/1/1 · fonts: 2 token/1 literal",
    );
  });
});

// ===========================================================================
// The ratchet itself, against the real operator trees -- exactly one of these
// two `it`s exists per invocation, chosen by CENSUS_WRITE (never both: a write
// invocation does not also run the plain check in the same pass).
// ===========================================================================

const WRITE_ENV = process.env.CENSUS_WRITE;

if (WRITE_ENV === "init" || WRITE_ENV === "1") {
  describe(`operator census baseline -- regenerating (CENSUS_WRITE=${WRITE_ENV})`, () => {
    it("writes tests/operator-census.baseline.json from the live operator trees", () => {
      const exists = fs.existsSync(BASELINE_PATH);
      const resolved = resolveWriteMode(WRITE_ENV, exists);
      if (resolved.mode !== "check" && resolved.error) throw new Error(resolved.error);

      const t0 = performance.now();
      const measured = scanTree(REPO_ROOT);
      const measuredFamilies = scanButtonTree(REPO_ROOT);
      const measuredFonts = scanFontSheets(REPO_ROOT);
      const elapsedMs = performance.now() - t0;
      console.log(
        `[operator-census] scanTree: ${elapsedMs.toFixed(1)}ms over ${Object.keys(measured).length} .tsx files across ${SCAN_ROOTS.length} roots + ${FONT_SHEETS.length} font sheets`,
      );

      const extra: ExtraMeasured = { buttonFamilies: measuredFamilies, fontDecls: measuredFonts };
      let next: CensusBaseline;
      if (resolved.mode === "init") {
        next = buildInitialBaseline(measured);
        next.buttonFamilies = recordsAtMeasured(measuredFamilies);
        next.fontDecls = recordsAtMeasured(measuredFonts);
      } else {
        next = mergeBaseline(parseBaseline(fs.readFileSync(BASELINE_PATH, "utf8")), measured, extra);
      }

      fs.writeFileSync(BASELINE_PATH, serializeBaseline(next));
      console.log(censusGateLine(measured, next, measuredFamilies, measuredFonts));

      // round-trip check: what we just wrote must itself be well-formed
      const reparsed = parseBaseline(fs.readFileSync(BASELINE_PATH, "utf8"));
      expect(Object.keys(reparsed.styleObjects).length).toBe(Object.keys(measured).length);
      expect(Object.keys(reparsed.buttonFamilies ?? {}).length).toBe(Object.keys(measuredFamilies).length);
      expect(Object.keys(reparsed.fontDecls ?? {}).length).toBe(Object.keys(measuredFonts).length);
    });
  });
} else {
  describe("operator census baseline -- the ratchet check", () => {
    it("never exceeds the committed baseline", () => {
      if (!fs.existsSync(BASELINE_PATH)) {
        throw new Error(
          "OPERATOR CENSUS: tests/operator-census.baseline.json is missing -- run `CENSUS_WRITE=init npx vitest run tests/operator-census.test.ts` once to create it.",
        );
      }
      const baseline = parseBaseline(fs.readFileSync(BASELINE_PATH, "utf8"));

      const t0 = performance.now();
      const measured = scanTree(REPO_ROOT);
      const measuredFamilies = scanButtonTree(REPO_ROOT);
      const measuredFonts = scanFontSheets(REPO_ROOT);
      const elapsedMs = performance.now() - t0;
      console.log(
        `[operator-census] scanTree: ${elapsedMs.toFixed(1)}ms over ${Object.keys(measured).length} .tsx files across ${SCAN_ROOTS.length} roots + ${FONT_SHEETS.length} font sheets`,
      );
      console.log(censusGateLine(measured, baseline, measuredFamilies, measuredFonts));

      const violations = compareBaseline(baseline, measured, { buttonFamilies: measuredFamilies, fontDecls: measuredFonts });
      if (violations.length > 0) throw new Error(formatFailureMessage(violations));
      expect(violations).toHaveLength(0);
    });
  });
}
