#!/usr/bin/env node
/**
 * console-matrix — the gate-riding oracle for the HAND-DECLARED /a route
 * policy (TASK-416, GUARD · chrome matrix). Run from the repo root:
 *   node scripts/console-matrix.test.mjs
 *
 * The policy (`scripts/console-matrix.routes.json`, beside this file) is the
 * oracle; the tree is the suspect — never the other way round (Astra's HOLD:
 * expectations derived from the tree would pass the very regression this
 * exists to catch). Pure node: an fs walk plus source greps. ZERO imports
 * from src/ — the tree is read as TEXT, never executed.
 *
 * Checks, both ways everywhere:
 *   (a) a page.tsx under src/app/a with no policy row — fails;
 *   (b) a policy row with no page.tsx — fails;
 *   (c) a `siteChrome: "redirect"` row (without alwaysRedirectTo) whose page
 *       lacks the FULL T-135 redirect idiom line — fails;
 *   (d) a `siteChrome: "render"` row whose page CARRIES that idiom — fails;
 *   (e) the alwaysRedirectTo class, both ways: a row carrying it must have an
 *       unconditional redirect to its target in source (and no signedOut);
 *       a row without it must carry signedOut: "gate" and its page must NOT
 *       redirect unconditionally (the /a/live class can neither hide nor
 *       appear silently).
 *
 * The idiom pattern matches the FULL redirect line —
 *   if (CONSOLE_CHROME === "site") redirect("/a");
 * NEVER the bare comparison: src/app/a/page.tsx:105 uses
 * `if (CONSOLE_CHROME === "site") {` for a RENDER branch (the standing proof
 * that a bare grep over-reports), and src/app/a/layout.tsx:30 is the switch
 * itself — neither is a carrier.
 *
 * The second half is unit coverage of the oracle's OWN parsing on scratch
 * fixture trees under the OS temp dir (never the real src/): a route added,
 * a row orphaned, an idiom removed, and the pair/idiom mirrors — each a
 * named failure the oracle must catch — plus a consistent-fixture control
 * that must come back clean.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const POLICY_PATH = path.join(root, "scripts", "console-matrix.routes.json");
const REAL_A_DIR = path.join(root, "src", "app", "a");

/* The FULL T-135 redirect idiom line — the closing paren of the comparison
   followed by the redirect call on the SAME line. The bare comparison alone
   is FORBIDDEN here (the page.tsx:105 trap). */
const T135_IDIOM = /CONSOLE_CHROME === "site"\)\s*redirect\("\/a"\)/;

/* An unconditional redirect: the redirect( call opens its own statement —
   no `if` guards it on the line. The alias rooms and /a/live all read
   `  redirect(<target>);` at statement start. */
const UNCONDITIONAL_REDIRECT = /^\s*redirect\(/m;

let passed = 0, failed = 0;
function t(name, cond, extra = "") {
  if (cond) { passed++; }
  else { failed++; console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`); }
}

/* ── the walk: route per page.tsx, dynamic segments kept as patterns ───── */
function walkPages(aDir) {
  const routes = [];
  (function descend(dir, parts) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) descend(path.join(dir, entry.name), [...parts, entry.name]);
      else if (entry.isFile() && entry.name === "page.tsx") routes.push("/a" + (parts.length ? "/" + parts.join("/") : ""));
    }
  })(aDir, []);
  return routes.sort();
}

/* ── the oracle: policy rows vs the tree, every check both ways ────────── */
function checkMatrix(aDir, policy) {
  const failures = [];
  const rows = policy.routes ?? [];
  const rowByRoute = new Map();
  for (const row of rows) {
    if (rowByRoute.has(row.route)) failures.push(`duplicate policy row: ${row.route}`);
    rowByRoute.set(row.route, row);
  }

  const pages = walkPages(aDir);
  const pageSet = new Set(pages);

  /* (a) tree → policy: a page with no row */
  for (const route of pages) {
    if (!rowByRoute.has(route)) failures.push(`page with no policy row: ${route}`);
  }

  for (const row of rows) {
    const file = path.join(aDir, ...row.route.slice(2).split("/").filter(Boolean), "page.tsx");
    /* (b) policy → tree: a row with no page */
    if (!pageSet.has(row.route)) {
      failures.push(`policy row with no page: ${row.route}`);
      continue;
    }
    const src = readFileSync(file, "utf8");
    const hasAlways = row.alwaysRedirectTo !== undefined;

    /* the pair, both directions (Astra's D2): alwaysRedirectTo present ⇔ signedOut absent */
    if (hasAlways && row.signedOut !== undefined)
      failures.push(`${row.route}: alwaysRedirectTo row must OMIT signedOut (found "${row.signedOut}")`);
    if (!hasAlways && row.signedOut === undefined)
      failures.push(`${row.route}: row without alwaysRedirectTo must declare signedOut: "gate"`);
    if (!hasAlways && row.signedOut !== undefined && row.signedOut !== "gate")
      failures.push(`${row.route}: unknown signedOut value "${row.signedOut}" (only "gate" is declared today)`);

    if (row.siteChrome !== "redirect" && row.siteChrome !== "render") {
      failures.push(`${row.route}: unknown siteChrome value "${row.siteChrome}"`);
      continue;
    }

    if (hasAlways) {
      /* (e) forward: the class says unconditional redirect — the source must show it, to the named target */
      if (row.siteChrome !== "redirect")
        failures.push(`${row.route}: an alwaysRedirectTo row redirects under every chrome — siteChrome must be "redirect"`);
      if (!UNCONDITIONAL_REDIRECT.test(src))
        failures.push(`${row.route}: alwaysRedirectTo "${row.alwaysRedirectTo}" but no unconditional redirect() in source`);
      if (!src.includes(`"${row.alwaysRedirectTo}"`))
        failures.push(`${row.route}: alwaysRedirectTo target "${row.alwaysRedirectTo}" not found in source`);
    } else {
      /* (e) reverse: no alwaysRedirectTo row may hide an unconditional redirect */
      if (UNCONDITIONAL_REDIRECT.test(src))
        failures.push(`${row.route}: source redirects unconditionally but the row declares no alwaysRedirectTo`);
      /* (c)/(d): the T-135 idiom, both ways, full-line pattern only */
      const carriesIdiom = T135_IDIOM.test(src);
      if (row.siteChrome === "redirect" && !carriesIdiom)
        failures.push(`${row.route}: policy says redirect under the site chrome but the full T-135 idiom line is absent`);
      if (row.siteChrome === "render" && carriesIdiom)
        failures.push(`${row.route}: policy says render but the source carries the T-135 redirect idiom`);
    }
  }
  return failures;
}

/* ── fixture scaffolding — scratch trees under the OS temp dir ─────────── */
const scratch = mkdtempSync(path.join(tmpdir(), "oc-console-matrix-"));
function fixture(pages) {
  const aDir = path.join(scratch, `fx${Math.random().toString(36).slice(2)}`, "a");
  for (const [route, src] of Object.entries(pages)) {
    const dir = path.join(aDir, ...route.slice(2).split("/").filter(Boolean));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "page.tsx"), src);
  }
  return aDir;
}
const RENDER_PAGE = `export default function P() {\n  return <div>a room</div>;\n}\n`;
const IDIOM_PAGE = `import { CONSOLE_CHROME } from "@/lib/console";\nimport { redirect } from "next/navigation";\nexport default function P() {\n  if (CONSOLE_CHROME === "site") redirect("/a"); // T-135 follow-through: house rooms never render under the site chrome\n  return <div>a room</div>;\n}\n`;
const ALIAS_PAGE = `import { redirect } from "next/navigation";\nexport default function P() {\n  redirect("/a/connections");\n}\n`;

/* ══ unit coverage: the oracle's own parsing, each failure named ═════════ */

/* control: a small CONSISTENT fixture must come back clean */
{
  const aDir = fixture({ "/a": RENDER_PAGE, "/a/bots": IDIOM_PAGE, "/a/chat": ALIAS_PAGE });
  const failures = checkMatrix(aDir, { routes: [
    { route: "/a", siteChrome: "render", signedOut: "gate" },
    { route: "/a/bots", siteChrome: "redirect", signedOut: "gate" },
    { route: "/a/chat", siteChrome: "redirect", alwaysRedirectTo: "/a/connections" },
  ] });
  t("fixture control: a consistent tree + policy is clean", failures.length === 0, failures.join(" | "));
}

/* a route added to the tree with no policy row */
{
  const aDir = fixture({ "/a": RENDER_PAGE, "/a/new-room": RENDER_PAGE });
  const failures = checkMatrix(aDir, { routes: [{ route: "/a", siteChrome: "render", signedOut: "gate" }] });
  t("fixture: route added → page with no policy row",
    failures.some((f) => f.includes("page with no policy row: /a/new-room")), failures.join(" | "));
}

/* a policy row orphaned — its page is gone */
{
  const aDir = fixture({ "/a": RENDER_PAGE });
  const failures = checkMatrix(aDir, { routes: [
    { route: "/a", siteChrome: "render", signedOut: "gate" },
    { route: "/a/ghost", siteChrome: "render", signedOut: "gate" },
  ] });
  t("fixture: row orphaned → policy row with no page",
    failures.some((f) => f.includes("policy row with no page: /a/ghost")), failures.join(" | "));
}

/* the idiom removed from a page the policy still calls redirect — Astra's
   HOLD regression: the oracle must catch exactly this */
{
  const aDir = fixture({ "/a/bots": RENDER_PAGE });
  const failures = checkMatrix(aDir, { routes: [{ route: "/a/bots", siteChrome: "redirect", signedOut: "gate" }] });
  t("fixture: idiom removed → redirect row lacking the full T-135 line",
    failures.some((f) => f.includes("/a/bots") && f.includes("idiom")), failures.join(" | "));
}

/* the mirror: a render row whose page grew the idiom silently */
{
  const aDir = fixture({ "/a/briefs": IDIOM_PAGE });
  const failures = checkMatrix(aDir, { routes: [{ route: "/a/briefs", siteChrome: "render", signedOut: "gate" }] });
  t("fixture: render row carrying the idiom → caught",
    failures.some((f) => f.includes("/a/briefs") && f.includes("carries the T-135")), failures.join(" | "));
}

/* the pair, first direction: an alwaysRedirectTo row still carrying signedOut */
{
  const aDir = fixture({ "/a/live": ALIAS_PAGE });
  const failures = checkMatrix(aDir, { routes: [{ route: "/a/live", siteChrome: "redirect", signedOut: "gate", alwaysRedirectTo: "/a/connections" }] });
  t("fixture: alwaysRedirectTo row with signedOut → pair violation caught",
    failures.some((f) => f.includes("/a/live") && f.includes("OMIT signedOut")), failures.join(" | "));
}

/* the pair, second direction: a signedOut row with no alwaysRedirectTo whose
   page redirects unconditionally — the class appearing silently */
{
  const aDir = fixture({ "/a/chat": ALIAS_PAGE });
  const failures = checkMatrix(aDir, { routes: [{ route: "/a/chat", siteChrome: "render", signedOut: "gate" }] });
  t("fixture: unconditional redirect without alwaysRedirectTo → caught",
    failures.some((f) => f.includes("/a/chat") && f.includes("no alwaysRedirectTo")), failures.join(" | "));
}

/* the class's forward leg: alwaysRedirectTo declared, the redirect gone */
{
  const aDir = fixture({ "/a/live": RENDER_PAGE });
  const failures = checkMatrix(aDir, { routes: [{ route: "/a/live", siteChrome: "redirect", alwaysRedirectTo: "/a/studio" }] });
  t("fixture: alwaysRedirectTo row, no unconditional redirect in source → caught",
    failures.some((f) => f.includes("/a/live") && f.includes("no unconditional redirect")), failures.join(" | "));
}

/* the bare-comparison trap, pinned as a fixture: a render BRANCH using
   `if (CONSOLE_CHROME === "site") {` must NOT read as the idiom */
{
  const BRANCH_PAGE = `import { CONSOLE_CHROME } from "@/lib/console";\nexport default function P() {\n  if (CONSOLE_CHROME === "site") {\n    return <div>site branch</div>;\n  }\n  return <div>a room</div>;\n}\n`;
  const aDir = fixture({ "/a": BRANCH_PAGE });
  const failures = checkMatrix(aDir, { routes: [{ route: "/a", siteChrome: "render", signedOut: "gate" }] });
  t("fixture: the page.tsx:105 render branch is NOT an idiom carrier", failures.length === 0, failures.join(" | "));
}

/* ══ the real tree against the committed policy ══════════════════════════ */
{
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
  const failures = checkMatrix(REAL_A_DIR, policy);
  for (const f of failures) console.log(`MATRIX  ${f}`);
  t("the real tree and the committed policy agree, every row, both ways", failures.length === 0,
    `${failures.length} disagreement(s)`);
  t("the policy holds one row per page under src/app/a",
    (policy.routes ?? []).length === walkPages(REAL_A_DIR).length,
    `${(policy.routes ?? []).length} rows vs ${walkPages(REAL_A_DIR).length} pages`);
}

rmSync(scratch, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
