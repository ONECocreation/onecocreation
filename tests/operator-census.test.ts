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
  /** Unknown top-level metric keys (TASK-419's, later) ride BESIDE styleObjects, preserved verbatim. */
  extraMetrics: Record<string, unknown>;
}

export type CensusViolation =
  | { kind: "count"; file: string; measured: number; baseline: number; examples: string[] }
  | { kind: "missing-file"; file: string };

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
      if (ts.isSourceFile(scope) || ts.isBlock(scope) || ts.isModuleBlock(scope) || ts.isCaseBlock(scope)) {
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
    if (ts.isJsxAttribute(node) && node.name.text === "style") {
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
 * The pure min-merge: every count becomes `min(old, measured)`, a vanished
 * file drops, a brand-new path enters at `min(measured, allowance)`. The
 * recorded names follow reality (rewritten wholesale -- they are review
 * data, never asserted). Unknown metric keys ride through untouched (the
 * TASK-419 seam). Never raises a number under any input.
 */
export function mergeBaseline(old: CensusBaseline, measured: Measured): CensusBaseline {
  const styleObjects: Record<string, StyleObjectsRecord> = {};
  for (const [file, census] of Object.entries(measured)) {
    const prev = old.styleObjects[file];
    const ceiling = prev ? prev.count : NEW_FILE_STYLE_OBJECT_ALLOWANCE;
    styleObjects[file] = {
      count: Math.min(ceiling, census.count),
      names: census.fingerprints.map(serializeFingerprint).sort(),
    };
  }
  return { styleObjects, extraMetrics: old.extraMetrics };
}

/**
 * The ratchet itself: `measured.count <= baseline.count` per scanned file
 * (an absent record means the new-file allowance, and no more; a recorded
 * file that no longer exists fails closed). The recorded names are NEVER
 * compared here -- ratchet, not identity guard.
 */
export function compareBaseline(baseline: CensusBaseline, measured: Measured): CensusViolation[] {
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
  return violations;
}

export function formatFailureMessage(violations: CensusViolation[]): string {
  const lines: string[] = [FAILURE_HEADER];
  for (const v of violations) {
    if (v.kind === "missing-file") {
      lines.push(`  ${v.file} -- recorded in the baseline but no longer exists; run write mode to drop it`);
      continue;
    }
    lines.push(`  ${v.file} -- styleObjects: measured ${v.measured}, baseline ${v.baseline}`);
    if (v.examples.length > 0) {
      lines.push("    examples of style objects in this file:");
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

/** Fail closed on anything that isn't exactly the expected shape; unknown metric keys ride through (the 419 seam). */
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
  const extraMetrics: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== "styleObjects") extraMetrics[k] = v;
  }
  return { styleObjects, extraMetrics };
}

/** Stable output: styleObjects first with sorted keys, extra metric keys sorted after, two-space indent, trailing newline, no timestamps, no sha. */
export function serializeBaseline(baseline: CensusBaseline): string {
  const sortRecord = <T,>(rec: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.keys(rec).sort().map((k) => [k, rec[k]]));
  const stable: Record<string, unknown> = { styleObjects: sortRecord(baseline.styleObjects) };
  for (const k of Object.keys(baseline.extraMetrics).sort()) stable[k] = baseline.extraMetrics[k];
  return `${JSON.stringify(stable, null, 2)}\n`;
}

export function totalObjects(measured: Measured): number {
  return Object.values(measured).reduce((sum, c) => sum + c.count, 0);
}

export function totalBaseline(baseline: CensusBaseline): number {
  return Object.values(baseline.styleObjects).reduce((sum, r) => sum + r.count, 0);
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
      const elapsedMs = performance.now() - t0;
      console.log(
        `[operator-census] scanTree: ${elapsedMs.toFixed(1)}ms over ${Object.keys(measured).length} .tsx files across ${SCAN_ROOTS.length} roots`,
      );

      const next =
        resolved.mode === "init" ? buildInitialBaseline(measured) : mergeBaseline(parseBaseline(fs.readFileSync(BASELINE_PATH, "utf8")), measured);

      fs.writeFileSync(BASELINE_PATH, serializeBaseline(next));
      console.log(`census: ${totalObjects(measured)} objects, baseline ${totalBaseline(next)}`);

      // round-trip check: what we just wrote must itself be well-formed
      const reparsed = parseBaseline(fs.readFileSync(BASELINE_PATH, "utf8"));
      expect(Object.keys(reparsed.styleObjects).length).toBe(Object.keys(measured).length);
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
      const elapsedMs = performance.now() - t0;
      console.log(
        `[operator-census] scanTree: ${elapsedMs.toFixed(1)}ms over ${Object.keys(measured).length} .tsx files across ${SCAN_ROOTS.length} roots`,
      );
      console.log(`census: ${totalObjects(measured)} objects, baseline ${totalBaseline(baseline)}`);

      const violations = compareBaseline(baseline, measured);
      if (violations.length > 0) throw new Error(formatFailureMessage(violations));
      expect(violations).toHaveLength(0);
    });
  });
}
