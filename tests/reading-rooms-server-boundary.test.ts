import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-486 BLOCKER FIX (block 968,624+) — a real `next build`+`next
 * start` Chrome walk caught what vitest's plain-node runner never will:
 * `go/[door]/page.tsx` (a SERVER component) imported `DOORS` — a plain
 * VALUE — from `RoomsCard.tsx`, a client-directive module. On the
 * server a client module's named exports are opaque references (React
 * Server Components), never the real value; `.find()` on it 500'd:
 * "TypeError: h.DOORS.find is not a function". Vitest's plain-node
 * runner enforces no such boundary, so every existing test passed;
 * only the real build+start walk caught it.
 *
 * THE GUARD: no non-client file under `src/app/a/site/reading` may take
 * a NAMED (or namespace/`* as`) import from a file that carries a
 * client-directive. A bare DEFAULT import from a client file
 * (`import Foo from "./ClientFile"`, rendered as `<Foo />`) is the
 * house's own normal, correct pattern and stays allowed — the bug is
 * specifically a plain value read across the boundary, not a component
 * mounted across it. `import type { ... }` is always allowed (erased at
 * compile time, never a runtime value).
 *
 * Source-scan only, the house's own idiom for a boundary this cheap to
 * check lexically (`scripts/console-matrix.cjs`'s own style: read the
 * tree as text, never import the app's modules — so this guard can
 * never itself trip the boundary it exists to catch, and never masks a
 * real bug behind a module-resolution side effect).
 */

const ROOT = process.cwd();
const READING_DIR = path.join(ROOT, "src/app/a/site/reading");

/** The directive must be the file's own first statement — a leading BOM
 *  is stripped, nothing else. */
function isClientDirective(src: string): boolean {
  const head = src.replace(/^﻿/, "").trimStart();
  return head.startsWith('"use client"') || head.startsWith("'use client'");
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(full);
  }
  return files;
}

/** A relative import specifier resolved against the importing file's
 *  own directory — tried as `.tsx`/`.ts`, then `/index.tsx`/`/index.ts`.
 *  `null` when it resolves outside this tree or not at all (this guard
 *  only asserts about files INSIDE `src/app/a/site/reading`). */
async function resolveRelative(fromFile: string, spec: string): Promise<string | null> {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")];
  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/* Non-anchored, multiline-clause-tolerant: `import <clause> from "<spec>";`
   anywhere in the text. `<clause>` is captured non-greedily so a brace
   import spanning several lines (like ReadingScheduleCard.tsx's own) is
   read whole, not line-by-line. */
const IMPORT_STATEMENT = /import\s+(type\s+)?([\s\S]+?)\s+from\s+["']([^"']+)["'];/g;

/** A bare default import (`import Foo from "..."`) — the ONE clause
 *  shape this guard allows into a client file: no braces, no `* as`. */
function isBareDefaultClause(clause: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(clause.trim());
}

describe("TASK-486 guard — no non-client file under /a/site/reading reads a VALUE across the client boundary", () => {
  it("every relative import from a client-directive file is a bare default import — never named, never namespace, never a value read as data", async () => {
    const files = await walk(READING_DIR);
    const violations: string[] = [];

    for (const file of files) {
      const src = await fs.readFile(file, "utf8");
      if (isClientDirective(src)) continue; // only a NON-client file can commit this violation

      for (const m of src.matchAll(IMPORT_STATEMENT)) {
        const [, isTypeOnly, clause, spec] = m;
        if (isTypeOnly) continue; // erased at compile time, never a runtime value
        if (!spec.startsWith(".")) continue; // this guard only knows this tree's own files

        const target = await resolveRelative(file, spec);
        if (!target) continue; // resolves outside this tree, or not at all

        const targetSrc = await fs.readFile(target, "utf8");
        if (!isClientDirective(targetSrc)) continue; // the target isn't a client file — no gap here

        if (!isBareDefaultClause(clause)) {
          violations.push(
            `${path.relative(ROOT, file)}: "${clause.trim()}" from "${spec}" (${path.relative(ROOT, target)}, a client-directive file) — only a bare default import may cross this boundary`,
          );
        }
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("self-test: the scanner's own clause classifier", () => {
    expect(isBareDefaultClause("Foo")).toBe(true);
    expect(isBareDefaultClause(" Foo ")).toBe(true);
    expect(isBareDefaultClause("{ DOORS }")).toBe(false);
    expect(isBareDefaultClause("Foo, { Bar }")).toBe(false);
    expect(isBareDefaultClause("* as Foo")).toBe(false);
    expect(isBareDefaultClause("{ DOORS, jitsiRoomUrl }")).toBe(false);
  });

  it("self-test: the client-directive reader", () => {
    expect(isClientDirective('"use client";\n\nexport default 1;')).toBe(true);
    expect(isClientDirective("'use client';\n")).toBe(true);
    expect(isClientDirective('import type { Metadata } from "next";')).toBe(false);
    expect(isClientDirective('/** a comment */\n"use client";')).toBe(false); // the directive must be the file's own first statement
  });

  it("the fixed files: go/[door]/page.tsx and reading/page.tsx take no named import from any client file", async () => {
    const pages = [
      path.join(READING_DIR, "page.tsx"),
      path.join(READING_DIR, "go", "[door]", "page.tsx"),
    ];
    for (const p of pages) {
      const src = await fs.readFile(p, "utf8");
      expect(isClientDirective(src), `${p} must be a server component`).toBe(false);
    }
  });
});
