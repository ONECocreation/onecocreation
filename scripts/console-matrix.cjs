#!/usr/bin/env node
/**
 * scripts/console-matrix.cjs — TASK-418 (GUARD · chrome matrix ★), the /a
 * chrome-matrix browser walker. Astra §5 `:110` second half: TWO build
 * configurations traverse every room/subroute, reading T-416's HAND-DECLARED
 * policy (scripts/console-matrix.routes.json) as the ONLY oracle — the
 * walker never derives an expectation from the tree and never adds its own
 * (a surprise beyond the policy lands in the report as a FINDING line,
 * never an assertion).
 *
 * It rides the T-282 shots-fixture idiom as a NEW sibling (mirror, never
 * edit): a PRODUCTION `next start` against a throwaway fixture KV
 * (scripts/fixture-kv.cjs) and a throwaway SEAT_SECRET, the operator cookie
 * minted by the REAL src/lib/operator-auth.ts makeOperatorToken (never a
 * hand-rolled HMAC), the dark/dawn theme-toggle recipe lifted from
 * shots-fixture.cjs (localStorage `oc-theme` + the `data-oc-theme`
 * attribute), puppeteer borrowed at runtime from puck-studio's node_modules
 * (never a dependency of this repo — a clear error if absent), every
 * listener killed on exit. NEVER the live site, NEVER the vault.
 *
 * PORT LAW (same as shots-fixture.sh): ports come ONLY from --ports A-B,
 * exactly four consecutive ports — A = the app server, A+1 = the fixture
 * KV, A+2 = reserve (the --selftest scratch server binds it), A+3 = reserve.
 * All four verified free BEFORE and AFTER the run. Missing --ports is a
 * hard refusal (exit 2), never a guess.
 *
 * THE CELL MATRIX: policy row × this build's chrome × {dark, dawn} ×
 * {operator cookie, signed out}. Per cell the walk asserts what the row
 * declares:
 *   siteChrome "redirect" (under the site build) → a redirect to /a,
 *     never a render (the first 3xx hop lands on /a);
 *   alwaysRedirectTo (both builds, both auths — it is unconditional) →
 *     the first 3xx hop lands on the named target (/a/studio, which itself
 *     then gates; alias rooms may chain a second hop under the site build
 *     when their target is itself a T-135 redirect row — the chain is
 *     recorded, the FIRST hop is the row's own truth);
 *   siteChrome "render" → HTTP 200, non-empty, no error boundary, no 500,
 *     and the room (never the gate) under a valid operator cookie;
 *   signedOut "gate" → the OperatorGate renders ("Operator sign-in"),
 *     never a crash;
 *   a row marked `pending` is asserted AS DECLARED TODAY and the note is
 *     printed beside the cell — today's truth, visibly pending.
 * The row's `source` key (416's per-row provenance) is READ and ignored —
 * never asserted.
 *
 * SITE-CHROME PROBES (Astra §6's drift locks — "Site clone: no SCAR DOM,
 * pixel/console font usage, Retronoid loading; computed-style checks,
 * including client navigation"). On every rendered page under the SITE
 * build (render cells, gate cells, and the client-navigation landing),
 * asserted against THE CHROME (everything outside the room-content root
 * main.mgmt-body — and a face LOAD anywhere):
 *   · zero `[class*="scar-"]` DOM nodes in the chrome (the SCAR·LET shell's
 *     furniture — scar.css loads under /a in both chromes, its DOM must not
 *     reach the artist's shell);
 *   · no element in the chrome whose COMPUTED font-family names the
 *     Retronoid or Press Start 2P faces (the DisplayFonts registration
 *     src/components/DisplayFonts.tsx `--font-retronoid`; next/font's
 *     `--font-press-start` on <html>) — what REACHED the DOM, not source;
 *   · no loaded FontFace for those families (document.fonts, page-wide);
 *   · no element in the chrome whose computed font-family equals the
 *     `--font-console` token's stack (globals.css:467).
 * Hits INSIDE room content are FINDING lines, never assertions: the rooms
 * are shared furniture by design (SiteConsoleShell.tsx: "Every ROOM is
 * untouched"), BriefsPanel's reader drawer is ScarConsole in both chromes
 * and BrandDesk's job is pouring the cartridges' own faces — a surprise
 * beyond the policy is reported, not asserted by a second oracle (the
 * brief's Named decision A; this scoping is this lane's named decision,
 * REGISTER.md).
 * Plus ONE client-navigation step per build: from /a, follow one in-app
 * link whose target row renders under this build's chrome, prove it was a
 * CLIENT navigation (a window marker survives — no document reload), and
 * re-assert the landing row (plus the §6 probes under the site build).
 *
 * DYNAMIC SEGMENTS (derive-or-dash — never a fabricated green). The
 * walker's own documented substitution table below names the fixture value
 * per pattern row and WHY it needs no seed beyond what this file sets up:
 *   /a/letters/[key]        → /a/letters/welcome — a SEEDED letter key
 *     (src/lib/letters.ts DEFAULT_AUDIENCE / LETTER_DEFAULTS): its words
 *     live in source, so the throwaway KV needs no letter seed.
 *   /a/studio/room/[room]   → /a/studio/room/onecocreation_studio — T-264's
 *     underscore-native id. It resolves by the NAMESPACE branch of
 *     resolveStudioRoom (src/app/meet/studio/room-access.ts:
 *     isStudioNamespaceRoom, prefix = the default vdoRoomPrefix
 *     "onecocreation"). The walker seeds the fixture KV's
 *     site:config:onecocreation with meeting.vdoHost = 127.0.0.1 so the
 *     registry branch's brand/rooms.json fetch fails LOOPBACK-fast —
 *     no request ever leaves for the real studio host (the lane's
 *     fixture-only law), and studioRoomKey mints from the throwaway
 *     SEAT_SECRET like any fixture run.
 * A pattern row with no substitution emits DASH cells, never a guess.
 *
 * --selftest: binds a scratch fixture server on A+2 that answers
 * DELIBERATELY WRONG (a 500 cell; a redirect where render is declared; a
 * render where redirect is declared) against a synthetic in-memory policy,
 * and proves the walk FAILS and names each bad cell (route · chrome ·
 * theme · auth). Prints the red run, then the green verdict. Run once at
 * build time by scripts/console-matrix.sh; the red-then-green is quoted in
 * the lane's SUMMARY.
 *
 * USAGE
 *   node scripts/console-matrix.cjs --chrome scar|site --ports A-B --out <dir>
 *   node scripts/console-matrix.cjs --selftest --ports A-B --out <dir>
 */
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");

const SELF_DIR = __dirname;
const REPO_ROOT = path.resolve(SELF_DIR, "..");
const POLICY_PATH = path.join(SELF_DIR, "console-matrix.routes.json");
const FIXTURE_KV = path.join(SELF_DIR, "fixture-kv.cjs");

const PUPPETEER = "/home/pac/dev/apps/puck-studio/node_modules/puppeteer";
const CHROME_BIN = "/usr/bin/chromium";

const THEMES = ["dark", "dawn"];
const AUTHS = ["operator", "signedout"];
/* R2: the OperatorGate is recognised by its DOM, never a body substring —
   `main.mgmt-ground h1.mgmt-title` reading "Operator sign-in"
   (src/components/OperatorGate.tsx:103 `<main className="mgmt-ground">`,
   :109 `<h1 className="mgmt-title mb-4">Operator sign-in</h1>`). The API's
   401 courtesy is the policy's second door, accepted ONLY on rows the
   policy marks `gateDoor: "api-401"` (the six client rooms whose page.tsx
   carries no OperatorGate). A signed-out gate cell fails on ANY redirect
   hop — redirect-then-gate does not meet the gate. */
const GATE_SELECTOR = "main.mgmt-ground h1.mgmt-title";
const GATE_TITLE = "Operator sign-in";
/* R3: the room's own denial words — an API's 401 courtesy surfacing in the
   room's text means the operator's room never opened. */
const DENIAL_WORDS = ["operator session required"];
const ERROR_MARKERS = ["application error", "internal server error"];

/* The dynamic-segment substitution table — the walker's OWN documented
   config (see the header). `url` is the fixture substitution; `why` is the
   seed story, printed in the report beside every substituted cell. */
const DYNAMIC_SUBS = {
  "/a/letters/[key]": {
    url: "/a/letters/welcome",
    why: "seeded letter key `welcome` (src/lib/letters.ts DEFAULT_AUDIENCE/LETTER_DEFAULTS) — words live in source, no KV seed needed",
  },
  "/a/studio/room/[room]": {
    url: "/a/studio/room/onecocreation_studio",
    why: "T-264's underscore-native id; resolves by NAMESPACE (isStudioNamespaceRoom, default prefix onecocreation) — fixture pins meeting.vdoHost to 127.0.0.1 so the rooms.json registry read fails loopback-fast, never the real studio host",
  },
};

/* The fixture seed that keeps the studio room's registry read loopback —
   merged over defaults by site-config.ts's sanitize(), so every other
   switch keeps its default. Behavior-neutral except vdoHost. */
const FIXTURE_SITE_CONFIG = { meeting: { vdoHost: "127.0.0.1" } };
const SITE_CONFIG_KV_KEY = "site:config:onecocreation";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ── args / ports ──────────────────────────────────────────────────────── */

function usage() {
  console.error(
    "usage: node scripts/console-matrix.cjs --chrome scar|site --ports A-B --out <dir>\n" +
      "       node scripts/console-matrix.cjs --selftest --ports A-B --out <dir>"
  );
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "selftest") {
      out.selftest = true;
      continue;
    }
    out[key] = argv[i + 1];
    i++;
  }
  return out;
}

function parsePorts(spec) {
  if (!spec) return null;
  const [a, b] = spec.split("-").map((s) => Number(s));
  if (!Number.isInteger(a) || !Number.isInteger(b) || b - a !== 3 || a <= 0 || b > 65535) return null;
  return { app: a, kv: a + 1, scratch: a + 2, spare: a + 3, span: spec };
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

async function allPortsFree(ports) {
  for (const p of [ports.app, ports.kv, ports.scratch, ports.spare]) {
    if (!(await portFree(p))) return p;
  }
  return 0;
}

/* ── small net helpers ─────────────────────────────────────────────────── */

function waitHttp(port, tries = 60) {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        req.destroy();
        if (++n >= tries) return resolve(false);
        setTimeout(tick, 1000);
      });
      req.on("timeout", () => {
        req.destroy();
        if (++n >= tries) return resolve(false);
        setTimeout(tick, 1000);
      });
    };
    tick();
  });
}

function kvPost(port, cmd) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(cmd);
    const req = http.request(
      { host: "127.0.0.1", port, path: "/", method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data).result);
          } catch (e) {
            reject(new Error(`fixture KV answered non-JSON: ${data.slice(0, 120)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });
}

/* Block-height stamp (house beacon) — the only clock this file reads.
   A failed read is a dash, never a civil date. */
function fetchBlockHeight() {
  return new Promise((resolve) => {
    const req = https.get("https://time.pacsarcade.org/height", { timeout: 3500 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data).height ?? null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/* ── the real operator mint (shots-fixture.sh's resolve-hook recipe) ──────
   Extensionless relative TS imports are the codebase's own convention; the
   hook below is the same one scripts/calendar-view.test.mjs teaches bare
   node, carried here verbatim from shots-fixture.sh so the cookie is minted
   by the REAL src/lib/operator-auth.ts makeOperatorToken — never a
   hand-rolled duplicate of the HMAC shape. */
const MINT_JS = `
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (err) {
      const notFound = err && typeof err === "object" && "code" in err && err.code === "ERR_MODULE_NOT_FOUND";
      if (notFound && specifier.startsWith(".") && context.parentURL) {
        for (const ext of [".ts", ".tsx", "/index.ts"]) {
          const candidate = new URL(specifier + ext, context.parentURL);
          if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
        }
      }
      throw err;
    }
  },
});
const REPO = process.cwd();
// ONE throwaway keypair feeds BOTH the OPERATOR_NPUBS allowlist env and the
// browser cookie, so the console's signed-in identity matches the
// allowlisted env (shots-fixture.sh's own shape, operator mode only — this
// walker never mints member cookies).
const { generateSecretKey, getPublicKey, nip19 } = await import("nostr-tools");
const envSk = generateSecretKey();
const envPubkeyHex = getPublicKey(envSk);
const envNpub = nip19.npubEncode(envPubkeyHex);
const { makeOperatorToken, OPERATOR_COOKIE } = await import(path.join(REPO, "src", "lib", "operator-auth.ts"));
process.stdout.write(JSON.stringify({
  operatorNpub: envNpub,
  cookieName: OPERATOR_COOKIE,
  cookieValue: makeOperatorToken(envPubkeyHex),
}));
`;

function mintOperator(seatSecret, logPath) {
  const res = spawnSync(process.execPath, ["--input-type=module", "-e", MINT_JS], {
    cwd: REPO_ROOT,
    env: { ...process.env, SEAT_SECRET: seatSecret },
    encoding: "utf8",
  });
  if (res.status !== 0 || !res.stdout) {
    fs.writeFileSync(logPath, `${res.stdout || ""}\n${res.stderr || ""}`);
    throw new Error(`console-matrix.cjs: operator mint failed — see ${logPath}`);
  }
  const out = JSON.parse(res.stdout);
  if (!out.operatorNpub || !out.cookieName || !out.cookieValue) {
    throw new Error("console-matrix.cjs: operator mint returned an incomplete shape");
  }
  return out;
}

/* ── policy ────────────────────────────────────────────────────────────── */

function readPolicy() {
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
  const rows = policy.routes;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("console-matrix.cjs: the policy has no routes list — the walker has no oracle");
  }
  const seen = new Set();
  for (const row of rows) {
    if (typeof row.route !== "string" || !row.route.startsWith("/a")) {
      throw new Error(`console-matrix.cjs: policy row with a bad route: ${JSON.stringify(row)}`);
    }
    if (seen.has(row.route)) throw new Error(`console-matrix.cjs: duplicate policy row: ${row.route}`);
    seen.add(row.route);
    if (row.siteChrome !== "redirect" && row.siteChrome !== "render") {
      throw new Error(`console-matrix.cjs: ${row.route}: unknown siteChrome value "${row.siteChrome}"`);
    }
    if (row.signedOut !== undefined && row.signedOut !== "gate") {
      throw new Error(`console-matrix.cjs: ${row.route}: unknown signedOut value "${row.signedOut}"`);
    }
    if (row.alwaysRedirectTo !== undefined && typeof row.alwaysRedirectTo !== "string") {
      throw new Error(`console-matrix.cjs: ${row.route}: alwaysRedirectTo must be a path string`);
    }
    /* gateDoor (R2): the API's 401 courtesy is the signed-out door ONLY on
       rows the policy marks for it — every other signed-out row must show
       the OperatorGate DOM. */
    if (row.gateDoor !== undefined && row.gateDoor !== "api-401") {
      throw new Error(`console-matrix.cjs: ${row.route}: unknown gateDoor value "${row.gateDoor}"`);
    }
    if (row.gateDoor !== undefined && row.alwaysRedirectTo !== undefined) {
      throw new Error(`console-matrix.cjs: ${row.route}: gateDoor on an alwaysRedirectTo row is nonsense`);
    }
    /* `source` is 416's per-row provenance — READ and ignored, never
       asserted (the Cut note's ruling). */
  }
  return rows;
}

/* What this cell must do — the policy row read against this build's chrome
   and this auth state. Nothing here comes from the tree. R2's order:
   alwaysRedirectTo redirects under EVERY auth (it is unconditional); a
   signedOut "gate" row owes the gate IN PLACE to a signed-out visitor —
   even where the same row redirects the operator under the site chrome
   (a redirect-then-gate does not meet the gate; the cell fails and the
   RED is reported, never patched). */
function expectationFor(row, chrome, auth) {
  if (row.alwaysRedirectTo) return { kind: "redirect", target: row.alwaysRedirectTo };
  if (auth === "signedout") return { kind: "gate", door: row.gateDoor ?? "operator-gate" };
  if (chrome === "site" && row.siteChrome === "redirect") return { kind: "redirect", target: "/a" };
  return { kind: "render" };
}

/* ── in-page probes (Astra §6, site build only) ──────────────────────────
   Everything below runs INSIDE the page. Token families named are the real
   ones: --font-console (globals.css:467), the scar-* class family
   (scar.css), the DisplayFonts --font-retronoid registration and
   next/font's --font-press-start on <html>.

   THE SCOPE RULING (this lane's named decision, REGISTER.md; TAKEN and
   HARDENED by Number One's R1 at block 968,203): §6's drift locks guard
   THE CHROME — "SCAR furniture leaked onto her clone" means the LCARS
   shell mounting under the artist's header/footer, a console face
   reaching the shell, a pixel face LOADING on her brand. The ROOMS are
   shared furniture by design (SiteConsoleShell.tsx: "Every ROOM is
   untouched — same pages, same APIs"). So: assertions live OUTSIDE the
   room-content root (main.mgmt-body; the gate's .mgmt-wrap), plus loaded
   faces page-wide — EXCEPT the SCAR IDENTITY nodes (.scar-brandline,
   .scar-readout, .scar-crumb), which fail PAGE-WIDE under the site build
   (R1: a SCAR shell nested inside the site room root is the leak §6
   guards). Font faces and other SCAR furniture inside room content stay
   FINDING lines (R1: /a/brand previews cartridge faces by design; the
   brief's Named decision A — a surprise beyond the policy is reported,
   never asserted by a second oracle). R3: the probes await
   document.fonts.ready first, so the face census is settled. */
async function probesInPage() {
  await document.fonts.ready;
  const norm = (s) => (s || "").toLowerCase().replace(/["'\s]/g, "");
  const PIXEL = /retronoid|pressstart2p/;
  const consoleStack = getComputedStyle(document.documentElement).getPropertyValue("--font-console").trim();
  const consoleNorm = norm(consoleStack);
  const contentRoot = document.querySelector("main.mgmt-body") || document.querySelector(".mgmt-wrap");
  const inRoom = (el) => !!(contentRoot && contentRoot.contains(el));
  const tag = (el) =>
    `${el.tagName.toLowerCase()}.${String(el.className).split(" ").filter(Boolean).slice(0, 2).join(".")}`.slice(0, 80);
  /* R1: the SCAR identity nodes fail PAGE-WIDE — collected separately */
  const identityHits = [];
  for (const el of document.querySelectorAll(".scar-brandline, .scar-readout, .scar-crumb")) {
    identityHits.push(tag(el));
  }
  const scarShell = [];
  const scarRoom = [];
  for (const el of document.querySelectorAll('[class*="scar-"]')) {
    if (el.matches(".scar-brandline, .scar-readout, .scar-crumb")) continue; // identity, above
    (inRoom(el) ? scarRoom : scarShell).push(tag(el));
  }
  const pixelShell = new Set();
  const pixelRoom = new Set();
  const shellConsole = new Set();
  let pageConsole = 0;
  for (const el of document.querySelectorAll("body *")) {
    const ff = getComputedStyle(el).fontFamily || "";
    const n = norm(ff);
    if (PIXEL.test(n)) (inRoom(el) ? pixelRoom : pixelShell).add(ff.trim().slice(0, 80));
    if (consoleNorm && n === consoleNorm) {
      pageConsole++;
      if (!inRoom(el)) shellConsole.add(tag(el));
    }
  }
  const loadedFaces = [];
  for (const face of document.fonts) {
    if (/retronoid|press start 2p/i.test(face.family) && face.status === "loaded") {
      loadedFaces.push(face.family);
    }
  }
  return {
    identityHits: identityHits.slice(0, 6),
    scarShell: scarShell.slice(0, 6),
    scarRoom: scarRoom.slice(0, 6),
    pixelShell: [...pixelShell].slice(0, 5),
    pixelRoom: [...pixelRoom].slice(0, 5),
    loadedFaces,
    shellConsoleFont: [...shellConsole].slice(0, 5),
    pageConsoleFontCount: pageConsole,
  };
}

/* §6 assertions (the CHROME) fail the cell; room-content hits become
   FINDING lines on the run — named, never asserted. */
function judgeProbes(probes, label, findings) {
  const bad = [];
  if (probes.identityHits.length > 0)
    bad.push(`scar identity node(s) under the site build (fail page-wide, R1): ${probes.identityHits.join(" | ")}`);
  if (probes.scarShell.length > 0) bad.push(`scar-* DOM node(s) in the site CHROME: ${probes.scarShell.join(" | ")}`);
  if (probes.pixelShell.length > 0) bad.push(`pixel/console display faces in the site CHROME's computed styles: ${probes.pixelShell.join(" | ")}`);
  if (probes.loadedFaces.length > 0) bad.push(`font faces LOADED on the site clone: ${probes.loadedFaces.join(" | ")}`);
  if (probes.shellConsoleFont.length > 0) bad.push(`--font-console stack in the site shell: ${probes.shellConsoleFont.join(" | ")}`);
  if (findings.length < 50 && probes.scarRoom.length > 0)
    findings.push(`${label}: scar-* furniture inside ROOM content under the site chrome (${probes.scarRoom.join(" | ")}) — shared room furniture by design; recorded, never asserted (the CHROME is the drift lock)`);
  if (findings.length < 50 && probes.pixelRoom.length > 0)
    findings.push(`${label}: pixel/console display faces in ROOM content computed styles under the site chrome (${probes.pixelRoom.join(" | ")}) — recorded, never asserted`);
  return bad;
}

/* ── the theme recipe (shots-fixture.cjs's, both halves) ───────────────── */

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    try {
      localStorage.setItem("oc-theme", t === "dawn" ? "light" : "dark");
    } catch {
      /* storage denied — the attribute below still drives the surface */
    }
    if (t === "dawn") document.documentElement.setAttribute("data-oc-theme", "light");
    else document.documentElement.removeAttribute("data-oc-theme");
  }, theme);
}

/* ── one cell ──────────────────────────────────────────────────────────── */

/* R5: no request leaves the box — every page walks behind request
   interception that aborts any http(s) request NOT to loopback; each abort
   is a FINDING line with its URL. (Server-side isolation is the env pins +
   the unshare wrapper in console-matrix.sh; this is the browser half.) */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function armInterception(page, label, findings) {
  page.on("request", (req) => {
    try {
      const u = new URL(req.url());
      if ((u.protocol === "http:" || u.protocol === "https:") && !LOOPBACK_HOSTS.has(u.hostname)) {
        if (findings.length < 50) findings.push(`off-box request aborted at ${label}: ${req.url().slice(0, 160)}`);
        req.abort().catch(() => {});
        return;
      }
    } catch {
      /* an unparseable URL is not a request off the box */
    }
    req.continue().catch(() => {});
  });
}

/* R3: the room root's text — site: `main.mgmt-body`; scar: `.scar-main`
   minus the shell nodes (ConsoleShell.tsx renders children inside
   .scar-main beside the scar-* topbar). */
function roomRootTextInPage(chrome) {
  if (chrome === "site") {
    const el = document.querySelector("main.mgmt-body");
    return el ? (el.textContent || "").trim() : "";
  }
  const root = document.querySelector(".scar-main");
  if (!root) return "";
  const clone = root.cloneNode(true);
  for (const el of clone.querySelectorAll('[class*="scar-"]')) el.remove();
  return (clone.textContent || "").trim();
}

/* R2: the OperatorGate by its DOM — main.mgmt-ground h1.mgmt-title reading
   "Operator sign-in" (OperatorGate.tsx:103/:109), never a body substring. */
function gateDomInPage() {
  const el = document.querySelector("main.mgmt-ground h1.mgmt-title");
  return el ? (el.textContent || "").trim() : null;
}

async function walkCell(ctx, base, row, url, chrome, theme, auth, cookie, findings) {
  const expect = expectationFor(row, chrome, auth);
  const expectLabel = expect.kind === "redirect" ? `redirect→${expect.target}` : expect.kind;
  const cell = {
    route: row.route,
    url,
    chrome,
    theme,
    auth,
    expect: expectLabel,
    result: "fail",
    detail: "",
    ...(row.pending ? { pending: row.pending } : {}),
  };
  const label = `${row.route} · chrome=${chrome} · theme=${theme} · auth=${auth}`;
  const baseOrigin = new URL(base).origin;
  let page;
  try {
    page = await ctx.newPage();
    page.setDefaultNavigationTimeout(30000);
    await page.setRequestInterception(true);
    armInterception(page, label, findings);
    const pageErrors = [];
    page.on("pageerror", (err) => {
      pageErrors.push(String(err).slice(0, 200));
      if (findings.length < 50) findings.push(`pageerror at ${label}: ${String(err).slice(0, 200)}`);
    });
    /* the localStorage half of the theme recipe BEFORE any app script runs
       (evaluateOnNewDocument), the attribute half after load — together
       they are shots-fixture.cjs's setTheme, applied honestly per cell. */
    await page.evaluateOnNewDocument((t) => {
      try {
        localStorage.setItem("oc-theme", t === "dawn" ? "light" : "dark");
      } catch {
        /* private mode — the post-load attribute still drives the surface */
      }
    }, theme);
    if (cookie && auth === "operator") {
      await page.setCookie({ name: cookie.name, value: cookie.value, domain: new URL(base).hostname, path: "/" });
    }
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });

    const hops = [];
    let api401 = 0;
    const sameOrigin500 = [];
    page.on("response", (r) => {
      try {
        const s = r.status();
        const u = new URL(r.url());
        /* the API's 401 courtesy — the policy's second signed-out door for
           gateDoor rows; a FAIL on render cells (R3) */
        if (s === 401 && u.pathname.startsWith("/api/admin/")) api401++;
        /* ANY same-origin ≥500, every resource type (R3) */
        if (s >= 500 && u.origin === baseOrigin) sameOrigin500.push(`${s} ${u.pathname}`.slice(0, 120));
        if (r.request().resourceType() !== "document") return;
        if (s >= 300 && s < 400) hops.push({ status: s, from: u.pathname, to: r.headers().location || "" });
      } catch {
        /* a raced response — the goto result below is the authority */
      }
    });

    const resp = await page.goto(`${base}${url}`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(500);
    await setTheme(page, theme);
    await sleep(200);

    const status = resp ? resp.status() : 0;
    const finalPath = new URL(page.url()).pathname;
    const text = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
    const hay = text.toLowerCase();
    const gateTitle = await page.evaluate(gateDomInPage).catch(() => null);
    const hasGate = gateTitle === GATE_TITLE;
    const hasError = status === 500 || ERROR_MARKERS.some((m) => hay.includes(m));
    const denial = DENIAL_WORDS.find((w) => hay.includes(w));
    const hopLabel = hops.length ? hops.map((h) => `${h.status} ${h.from}→${h.to}`).join("; ") : "no hops";

    const bad = [];
    if (expect.kind === "redirect") {
      /* R6: the first hop is compared by ORIGIN AND pathname */
      const first = hops.length ? new URL(hops[0].to, base) : null;
      if (!hops.length) bad.push(`expected redirect to ${expect.target}, got a render (HTTP ${status} at ${finalPath})`);
      else if (first.origin !== baseOrigin)
        bad.push(`first hop left the origin — landed on ${first.origin}${first.pathname}, not ${expect.target} (${hopLabel})`);
      else if (first.pathname !== expect.target)
        bad.push(`first hop landed on ${first.pathname}, not ${expect.target} (${hopLabel})`);
      if (finalPath === url) bad.push(`never left ${url}`);
      if (status !== 200) bad.push(`landing answered HTTP ${status}`);
      if (hasError) bad.push("error boundary on the landing");
    } else if (expect.kind === "gate") {
      /* R2: a signed-out gate cell fails on ANY redirect hop */
      if (hops.length) bad.push(`signed-out met a redirect, not the gate (${hopLabel}) — redirect-then-gate does not meet the gate`);
      if (status !== 200) bad.push(`expected the gate (HTTP 200), got HTTP ${status}`);
      if (hasError) bad.push("error boundary / 500 instead of the gate");
      /* the policy's two named doors: the OperatorGate DOM on every row,
         the API's 401 courtesy ONLY on gateDoor rows (R2) */
      const doorOk = hasGate || (expect.door === "api-401" && api401 > 0);
      if (!doorOk)
        bad.push(
          expect.door === "api-401"
            ? `neither the OperatorGate DOM (${GATE_SELECTOR}) nor the API's 401 courtesy appeared — the signed-out door did not render`
            : `no OperatorGate DOM (${GATE_SELECTOR} = "${GATE_TITLE}") — the signed-out door did not render`
        );
      cell.gateMetBy = hasGate ? "operator-gate" : api401 > 0 ? `api-401-courtesy (${api401})` : "none";
    } else {
      /* R3: render cells prove the ROOM, not a page */
      if (status !== 200) bad.push(`expected render (HTTP 200), got HTTP ${status}`);
      if (hasError) bad.push("error boundary / 500");
      if (hops.length) bad.push(`expected a render, got redirected (${hopLabel})`);
      if (api401 > 0) bad.push(`${api401} /api/admin/* 401(s) under a valid operator cookie`);
      if (denial) bad.push(`the room's own denial words on the page: "${denial}"`);
      if (sameOrigin500.length) bad.push(`same-origin ≥500: ${sameOrigin500.slice(0, 3).join(" | ")}`);
      if (pageErrors.length) bad.push(`pageerror: ${pageErrors[0]}`);
      if (hasGate) bad.push("the gate rendered under a valid operator cookie — the room never opened");
      const roomText = await page.evaluate(roomRootTextInPage, chrome).catch(() => "");
      if (roomText.length < 10) bad.push(`the room root holds ${roomText.length} character(s) of text — the room did not render`);
    }

    /* Astra §6 computed-style probes — the SITE build only, on every page
       that actually rendered (render cells AND the signed-out gate). R3:
       a probe evaluate that throws FAILS the cell — never skipped. */
    if (chrome === "site" && (expect.kind === "render" || expect.kind === "gate") && status === 200 && !hasError) {
      let probes = null;
      try {
        probes = await page.evaluate(probesInPage);
      } catch (err) {
        bad.push(`the §6 probe evaluate threw: ${String(err).slice(0, 160)}`);
      }
      if (probes) {
        cell.probes = probes;
        for (const b of judgeProbes(probes, label, findings)) bad.push(b);
      }
    }

    cell.detail =
      `HTTP ${status} at ${finalPath}${hops.length ? ` (${hopLabel})` : ""}` +
      (cell.gateMetBy ? ` · gate met by ${cell.gateMetBy}` : "") +
      (bad.length ? ` — ${bad.join(" · ")}` : "");
    cell.result = bad.length ? "fail" : "pass";
  } catch (err) {
    cell.result = "fail";
    cell.detail = `walk threw: ${String(err).slice(0, 300)}`;
  } finally {
    if (page) await page.close().catch(() => {});
  }
  return cell;
}

/* ── one client-navigation step per build (Astra §6: "including client
   navigation") — from /a, follow ONE in-app link whose target row renders
   under this build's chrome, prove the nav was client-side (a window
   marker survives), re-assert the landing row. A spot-check, honestly
   labelled — never a traversal. */
async function clientNavStep(ctx, base, rows, chrome, cookie, findings) {
  const step = { from: "/a", result: "dash", detail: "", to: null, navigationKind: null };
  let page;
  try {
    const renderable = new Set(
      rows
        .filter((r) => !r.alwaysRedirectTo && (chrome === "scar" || r.siteChrome === "render"))
        .map((r) => (DYNAMIC_SUBS[r.route] ? DYNAMIC_SUBS[r.route].url : r.route))
    );
    page = await ctx.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.on("pageerror", (err) => {
      if (findings.length < 50) findings.push(`pageerror at client-nav step: ${String(err).slice(0, 200)}`);
    });
    if (cookie) {
      await page.setCookie({ name: cookie.name, value: cookie.value, domain: new URL(base).hostname, path: "/" });
    }
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
    const resp = await page.goto(`${base}/a`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(800);
    if (!resp || resp.status() !== 200) {
      step.detail = `/a answered HTTP ${resp ? resp.status() : "?"} — no link followed`;
      return step;
    }
    const links = await page.$$eval('a[href^="/a"]', (els) =>
      els.map((e) => e.getAttribute("href")).filter((h) => h && !h.includes("#"))
    );
    const to = links.map((h) => h.split("?")[0]).find((p) => p !== "/a" && renderable.has(p));
    if (!to) {
      step.detail = "no in-app link from /a named a renderable policy row — no link followed";
      return step;
    }
    step.to = to;
    const row = rows.find((r) => (DYNAMIC_SUBS[r.route] ? DYNAMIC_SUBS[r.route].url : r.route) === to);
    await page.evaluate(() => {
      window.__consoleMatrixNavMark = "client";
    });
    await page.click(`a[href="${to}"]`);
    await sleep(2500);
    const mark = await page.evaluate(() => window.__consoleMatrixNavMark || null);
    step.navigationKind = mark === "client" ? "client" : "document";
    const finalPath = new URL(page.url()).pathname;
    const text = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
    const hay = text.toLowerCase();
    const hasError = ERROR_MARKERS.some((m) => hay.includes(m));
    const bad = [];
    if (finalPath !== to) bad.push(`after the click the URL is ${finalPath}, not ${to}`);
    if (hasError) bad.push("error boundary after client navigation");
    if (text.trim().length < 10) bad.push("empty page after client navigation");
    const navGate = await page.evaluate(gateDomInPage).catch(() => null);
    if (navGate === GATE_TITLE) bad.push("the gate rendered after client navigation with a valid operator cookie");
    if (step.navigationKind !== "client") {
      /* a document reload is not the drift Astra §6 names, but the step was
         asked to exercise the CLIENT path — recorded as a finding, not a
         failure of the row. */
      findings.push(`client-nav step: /a → ${to} navigated as a DOCUMENT load, not a client navigation`);
    }
    if (chrome === "site" && !hasError) {
      const probes = await page.evaluate(probesInPage).catch(() => null);
      if (probes) {
        step.probes = probes;
        for (const b of judgeProbes(probes, `client-nav ${to}`, findings)) bad.push(b);
      }
    }
    step.result = bad.length ? "fail" : "pass";
    step.detail =
      `/a → ${to} (${step.navigationKind} navigation${row && row.pending ? `, row pending: ${row.pending}` : ""})` +
      (bad.length ? ` — ${bad.join(" · ")}` : "");
  } catch (err) {
    step.result = "fail";
    step.detail = `client-nav step threw: ${String(err).slice(0, 300)}`;
  } finally {
    if (page) await page.close().catch(() => {});
  }
  return step;
}

/* ── the walk itself ───────────────────────────────────────────────────── */

async function walkPolicy(browser, { base, rows, chrome, cookie, findings, runClientNav }) {
  const cells = [];
  const signedOutCtx = browser.defaultBrowserContext();
  /* any cookie'd page gets a FRESH incognito context — never the default
     context puppeteer shares across pages (task-280's lesson, carried by
     shots-fixture.cjs): a signed-in cell can never leak into a signed-out
     one in the same run. */
  const operatorCtx = cookie ? await browser.createBrowserContext() : null;

  for (const row of rows) {
    const isPattern = row.route.includes("[");
    const sub = isPattern ? DYNAMIC_SUBS[row.route] : null;
    const url = sub ? sub.url : row.route;
    for (const theme of THEMES) {
      for (const auth of AUTHS) {
        if (isPattern && !sub) {
          cells.push({
            route: row.route,
            url: null,
            chrome,
            theme,
            auth,
            expect: "dash",
            result: "dash",
            detail: "dynamic segment with no substitution in the walker's config — DASH, never a fabricated green",
            ...(row.pending ? { pending: row.pending } : {}),
          });
          continue;
        }
        const ctx = auth === "operator" ? operatorCtx : signedOutCtx;
        const cell = await walkCell(ctx, base, row, url, chrome, theme, auth, cookie, findings);
        if (sub) cell.substitution = sub.why;
        cells.push(cell);
        const mark = cell.result === "pass" ? "ok" : cell.result.toUpperCase();
        console.log(
          `cell ${mark}  ${row.route} · ${theme} · ${auth}${cell.pending ? ` · pending "${cell.pending}"` : ""} — ${cell.detail}`
        );
      }
    }
  }

  let clientNav = null;
  if (runClientNav) {
    clientNav = await clientNavStep(operatorCtx ?? signedOutCtx, base, rows, chrome, cookie, findings);
    console.log(`client-nav ${clientNav.result.toUpperCase()}  ${clientNav.detail}`);
  }

  if (operatorCtx) await operatorCtx.close().catch(() => {});
  return { cells, clientNav };
}

/* ── the human one-screen summary ──────────────────────────────────────── */

function summaryLines(report) {
  const { cells, clientNav, findings, chrome } = report;
  const pass = cells.filter((c) => c.result === "pass").length;
  const fail = cells.filter((c) => c.result === "fail");
  const dash = cells.filter((c) => c.result === "dash");
  const pending = [...new Set(cells.filter((c) => c.pending).map((c) => `${c.route} — "${c.pending}"`))];
  const lines = [];
  lines.push(
    `console-matrix · chrome=${chrome} · ${report.rows} policy rows · ${cells.length} cells` +
      (report.blockHeight ? ` · block ${report.blockHeight.toLocaleString("en-US")}` : " · block —")
  );
  lines.push(`cells: PASS ${pass} · FAIL ${fail.length} · DASH ${dash.length}`);
  for (const c of fail) lines.push(`  FAIL ${c.route} · theme=${c.theme} · auth=${c.auth} — ${c.detail}`);
  for (const c of dash) lines.push(`  DASH ${c.route} · theme=${c.theme} · auth=${c.auth} — ${c.detail}`);
  for (const p of pending) lines.push(`  pending (asserted as declared today): ${p}`);
  if (clientNav) lines.push(`client-nav: ${clientNav.result.toUpperCase()} — ${clientNav.detail}`);
  lines.push(`findings: ${findings.length}`);
  for (const f of findings.slice(0, 10)) lines.push(`  FINDING ${f}`);
  lines.push(`result: ${fail.length === 0 && (!clientNav || clientNav.result !== "fail") ? "GREEN" : "RED"}`);
  return lines;
}

/* ── puppeteer, borrowed at runtime (house law: never a dependency) ────── */

function loadPuppeteer() {
  if (!fs.existsSync(path.join(PUPPETEER, "package.json"))) {
    console.error(
      `console-matrix.cjs: puppeteer not found at ${PUPPETEER} — it is borrowed at runtime from\n` +
        "puck-studio's node_modules (never a dependency of this repo). Restore that checkout or\n" +
        "point a ruling at a new borrow home; this walker cannot run without it."
    );
    process.exit(2);
  }
  if (!fs.existsSync(CHROME_BIN)) {
    console.error(`console-matrix.cjs: the system chromium is not at ${CHROME_BIN}`);
    process.exit(2);
  }
  return require(PUPPETEER);
}

async function launchBrowser(puppeteer) {
  return puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: "new",
    args: ["--no-sandbox", "--force-device-scale-factor=1"],
  });
}

/* ── selftest: the walker's own red-then-green ─────────────────────────── */

const SELFTEST_ROWS = [
  { route: "/a", siteChrome: "render", signedOut: "gate" }, // control — the scratch serves it honestly
  { route: "/a/broken", siteChrome: "render", signedOut: "gate" }, // render declared, the scratch 500s
  { route: "/a/sneaky", siteChrome: "render", signedOut: "gate" }, // render declared, the scratch 302s away
  { route: "/a/bots", siteChrome: "redirect", signedOut: "gate", source: "selftest" }, // redirect declared, the scratch RENDERS
];

const SELFTEST_ROOM =
  '<!doctype html><html><body><main class="mgmt-body"><h1>A room</h1><p>the room renders here, honestly and at length.</p></main></body></html>';
const SELFTEST_GATE = `<!doctype html><html><body><main class="mgmt-ground"><h1 class="mgmt-title">${GATE_TITLE}</h1><p>This area is for site operators.</p></main></body></html>`;

async function selftest(ports, outDir) {
  /* the scratch fixture server — deliberately wrong in three named ways */
  const scratch = http.createServer((req, res) => {
    const u = new URL(req.url || "/", "http://127.0.0.1");
    const authed = (req.headers.cookie || "").includes("fe-operator=");
    if (u.pathname === "/a") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(authed ? SELFTEST_ROOM : SELFTEST_GATE);
    } else if (u.pathname === "/a/broken") {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end("<!doctype html><html><body>Internal Server Error</body></html>");
    } else if (u.pathname === "/a/sneaky") {
      res.writeHead(302, { Location: "/a" });
      res.end();
    } else if (u.pathname === "/a/bots") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(authed ? SELFTEST_ROOM : SELFTEST_GATE);
    } else {
      res.writeHead(404);
      res.end("nope");
    }
  });
  await new Promise((resolve) => scratch.listen(ports.scratch, "127.0.0.1", resolve));

  const lines = [];
  lines.push("SELFTEST · the walker against a scratch fixture server that answers DELIBERATELY WRONG");
  lines.push("scratch wrongs: /a/broken 500s · /a/sneaky 302s where render is declared · /a/bots RENDERS where redirect is declared (site chrome)");
  let rc = 1;
  try {
    const puppeteer = loadPuppeteer();
    const browser = await launchBrowser(puppeteer);
    const findings = [];
    const log = console.log;
    const captured = [];
    console.log = (...a) => captured.push(a.join(" "));
    let result;
    try {
      result = await walkPolicy(browser, {
        base: `http://127.0.0.1:${ports.scratch}`,
        rows: SELFTEST_ROWS,
        chrome: "site",
        cookie: { name: "fe-operator", value: "selftest-throwaway" },
        findings,
        runClientNav: false,
      });
    } finally {
      console.log = log;
      await browser.close().catch(() => {});
    }
    lines.push("— the red run, verbatim (every bad cell named: route · theme · auth) —");
    lines.push(...captured);
    const failRoutes = new Set(result.cells.filter((c) => c.result === "fail").map((c) => c.route));
    const passRoutes = new Set(result.cells.filter((c) => c.result === "pass").map((c) => c.route));
    const expectedFails = ["/a/broken", "/a/sneaky", "/a/bots"];
    const caughtAll = expectedFails.every((r) => failRoutes.has(r));
    const controlClean = passRoutes.has("/a") && !failRoutes.has("/a");
    const named = captured.filter((l) => l.startsWith("cell FAIL")).length;
    lines.push("— the green verdict —");
    if (caughtAll && controlClean) {
      lines.push(
        `SELFTEST GREEN: the walk FAILED as it must — ${named} failing cells across ${[...failRoutes].join(", ")} ` +
          `(a 500 cell, a redirect where render was declared, a render where redirect was declared), ` +
          `each named with route · theme · auth; the honest control row /a passed.`
      );
      rc = 0;
    } else {
      lines.push(
        `SELFTEST RED: the walker did NOT catch what it must (caught: ${[...failRoutes].join(", ") || "none"}; ` +
          `control /a ${controlClean ? "clean" : "WRONGLY failed"}) — the walker itself is suspect, do not trust a run`
      );
      rc = 1;
    }
  } catch (err) {
    lines.push(`SELFTEST RED: threw — ${String(err).slice(0, 300)}`);
    rc = 1;
  } finally {
    await new Promise((resolve) => scratch.close(resolve));
  }
  for (const l of lines) console.log(l);
  fs.writeFileSync(path.join(outDir, "selftest.txt"), lines.join("\n") + "\n");
  return rc;
}

/* ── main ──────────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ports = parsePorts(args.ports);
  if (!ports) {
    console.error("console-matrix.cjs: --ports A-B is required and must span exactly four ports (A to A+3)");
    usage();
    process.exit(2);
  }
  const outDir = args.out;
  if (!outDir) {
    console.error("console-matrix.cjs: --out <dir> is required");
    usage();
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const busy = await allPortsFree(ports);
  if (busy) {
    console.error(
      `console-matrix.cjs: port ${busy} is already bound — refusing to start (the T-232 collision the port law exists to end)`
    );
    process.exit(3);
  }

  if (args.selftest) {
    const rc = await selftest(ports, outDir);
    const still = await allPortsFree(ports);
    if (still) {
      console.error(`console-matrix.cjs: WARNING port ${still} still bound after selftest`);
      process.exit(1);
    }
    console.log(`console-matrix.cjs: all four ports (${ports.span}) verified free after selftest`);
    process.exit(rc);
  }

  const chrome = args.chrome;
  if (chrome !== "scar" && chrome !== "site") {
    console.error('console-matrix.cjs: --chrome must be "scar" or "site" (which build is being served)');
    usage();
    process.exit(2);
  }

  const rows = readPolicy();
  const blockHeight = await fetchBlockHeight();
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();

  /* throwaway fixture secrets, never the vault — minted fresh for this run
     and dead with it */
  const seatSecret = `fixture-seat-${Date.now()}-${process.pid}`;
  const kvToken = `fixture-kv-token-${process.pid}`;

  let kvChild = null;
  let appChild = null;
  let exitCode = 1;
  try {
    /* fixture KV on A+1, then the loopback vdoHost seed (see header) */
    kvChild = spawn(process.execPath, [FIXTURE_KV], {
      env: { ...process.env, FIXTURE_KV_PORT: String(ports.kv) },
      stdio: ["ignore", fs.openSync(path.join(outDir, `kv-${chrome}.log`), "w"), "inherit"],
    });
    if (!(await waitHttp(ports.kv, 30))) throw new Error("the fixture KV never came up");
    const seeded = await kvPost(ports.kv, ["SET", SITE_CONFIG_KV_KEY, JSON.stringify(FIXTURE_SITE_CONFIG)]);
    if (seeded !== "OK") throw new Error(`the fixture site-config seed did not land: ${seeded}`);

    const mint = mintOperator(seatSecret, path.join(outDir, `mint-${chrome}.log`));

    /* the production server, throwaway env only (shots-fixture.sh's set) */
    const appLog = fs.openSync(path.join(outDir, `serve-app-${chrome}.log`), "w");
    appChild = spawn("npx", ["next", "start", "-p", String(ports.app), "-H", "127.0.0.1"], {
      cwd: REPO_ROOT,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: "production",
        SEAT_SECRET: seatSecret,
        KV_REST_API_URL: `http://127.0.0.1:${ports.kv}`,
        KV_REST_API_TOKEN: kvToken,
        BTCPAY_URL: "http://btcpay.fixture",
        BTCPAY_STORE_ID: "fixture-store",
        BTCPAY_API_KEY: "fixture-key",
        SQUARE_ACCESS_TOKEN: "fixture-square-token",
        SQUARE_LOCATION_ID: "fixture-location",
        OPERATOR_NPUBS: mint.operatorNpub,
      },
      stdio: ["ignore", appLog, appLog],
    });
    if (!(await waitHttp(ports.app, 60))) throw new Error(`next start never came up on ${ports.app}`);
    await sleep(2);

    const puppeteer = loadPuppeteer();
    const browser = await launchBrowser(puppeteer);
    const findings = [];
    let result;
    try {
      result = await walkPolicy(browser, {
        base: `http://127.0.0.1:${ports.app}`,
        rows,
        chrome,
        cookie: { name: mint.cookieName, value: mint.cookieValue },
        findings,
        runClientNav: true,
      });
    } finally {
      await browser.close().catch(() => {});
    }

    const report = {
      tool: "console-matrix (TASK-418)",
      chrome,
      policy: "scripts/console-matrix.routes.json",
      base: head,
      blockHeight,
      rows: rows.length,
      portSpan: ports.span,
      cells: result.cells,
      clientNav: result.clientNav,
      findings,
    };
    fs.writeFileSync(path.join(outDir, `matrix-report-${chrome}.json`), JSON.stringify(report, null, 2) + "\n");
    const lines = summaryLines(report);
    for (const l of lines) console.log(l);
    fs.writeFileSync(path.join(outDir, `walk-${chrome}.summary.txt`), lines.join("\n") + "\n");

    const anyFail = result.cells.some((c) => c.result === "fail") || (result.clientNav && result.clientNav.result === "fail");
    exitCode = anyFail ? 1 : 0;
  } catch (err) {
    console.error(`console-matrix.cjs: ${String(err && err.message ? err.message : err)}`);
    exitCode = 1;
  } finally {
    for (const child of [appChild, kvChild]) {
      if (child) child.kill("SIGTERM");
    }
    await sleep(1500);
    const still = await allPortsFree(ports);
    if (still) {
      console.error(`console-matrix.cjs: WARNING port ${still} still bound after cleanup`);
      exitCode = 1;
    } else {
      console.log(`console-matrix.cjs: all four ports (${ports.span}) verified free after cleanup`);
    }
  }
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
