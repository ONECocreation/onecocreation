#!/usr/bin/env node
/**
 * scripts/admin-walk.cjs — the /a phone walk (Lumen's operator-rooms brief,
 * block 975,990, pin 1). Walks every room in scripts/admin-walk.rooms.json
 * at 390 wide in the night theme, signed in as a seeded operator, and FAILS
 * on any of:
 *   fields   a field (input / select / textarea) whose ground is light in
 *            the night theme (A1);
 *   controls a button, link-button, field, switch or summary under 44 px
 *            tall (A2). A link inside running text is exempt (WCAG 2.5.8's
 *            inline exception); a checkbox or radio counts by its label;
 *   text     any text under 12 px (A3) — measured at 390 AND at 1440,
 *            because A3 holds at any width;
 *   sideways the page wider than the phone, any part that scrolls sideways,
 *            or a part that runs off the right edge unclipped (A4);
 *   heading  the room's h1 is not its own name (A5).
 * The scope is the console shell (`.mgmt-shell`: the side menu and the room),
 * not the public site header above it.
 *
 * It rides the console-matrix.cjs idiom (mirror, never edit): a PRODUCTION
 * `next start` against the throwaway fixture KV (scripts/fixture-kv.cjs) and
 * a throwaway SEAT_SECRET, the operator cookie minted by the REAL
 * src/lib/operator-auth.ts makeOperatorToken, puppeteer borrowed at runtime
 * from puck-studio's node_modules (never a dependency), every listener
 * killed on exit. NEVER the live site, never the vault, and it presses
 * nothing: it only loads rooms and reads them.
 *
 * Ports come ONLY from --ports A-B (four consecutive: A = app, A+1 = KV,
 * A+2 and A+3 held free). The build must already exist (`next build` with
 * NEXT_PUBLIC_CONSOLE_CHROME=site); this walker never builds.
 *
 * USAGE
 *   node scripts/admin-walk.cjs --ports A-B --out <dir>
 *       [--repo <tree>]          serve another tree's .next (a before/after run)
 *       [--seed-kv <file>]       a JSON array of fixture-KV commands to seed
 *       [--extra-probe <file>]   also run this in-page probe per room, kept raw
 *       [--shots]                also take pictures: 390 and 1440, night and
 *                                dawn, skipping any room marked private
 *       [--shot-max <px>]        cap a picture's height (default 4000)
 *       [--only <route,route>]   walk only these rooms
 *       [--serve]                walk nothing: hold the fixture up, write
 *                                <out>/serve.json (base URL + the minted
 *                                cookie, both throwaway), stop on Ctrl-C
 * Exit 0 = every room passes; 1 = a room failed (the report says which and
 * why); 2 = it could not run.
 */
"use strict";
/* a plain node CommonJS script (the console-matrix.cjs sibling): require is its import */
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");

const SELF_DIR = __dirname;
const FIXTURE_KV = path.join(SELF_DIR, "fixture-kv.cjs");
const ROOMS_PATH = path.join(SELF_DIR, "admin-walk.rooms.json");
const PUPPETEER = "/home/pac/dev/apps/puck-studio/node_modules/puppeteer";
const CHROME_BIN = "/usr/bin/chromium";

const PHONE = { width: 390, height: 844 };
const DESK = { width: 1440, height: 900 };
const MIN_TAP = 44;
const MIN_TEXT = 12;

const FIXTURE_SITE_CONFIG = { meeting: { vdoHost: "127.0.0.1", jitsiDomain: "127.0.0.1" } };
const SITE_CONFIG_KV_KEY = "site:config:onecocreation";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const a = { shots: false, shotMax: 4000 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === "--ports") a.ports = v();
    else if (k === "--out") a.out = v();
    else if (k === "--repo") a.repo = v();
    else if (k === "--seed-kv") a.seedKv = v();
    else if (k === "--extra-probe") a.extraProbe = v();
    else if (k === "--shots") a.shots = true;
    else if (k === "--shot-max") a.shotMax = Number(v());
    else if (k === "--only") a.only = v().split(",");
    else if (k === "--serve") a.serve = true;
    else {
      console.error(`admin-walk.cjs: unrecognized argument ${k}`);
      process.exit(2);
    }
  }
  return a;
}

function parsePorts(spec) {
  if (!spec) return null;
  const [a, b] = spec.split("-").map(Number);
  if (!Number.isInteger(a) || b - a !== 3 || a <= 0 || b > 65535) return null;
  return { app: a, kv: a + 1, all: [a, a + 1, a + 2, a + 3] };
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

function waitHttp(port, tries = 60) {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        resolve(true);
      });
      const again = () => {
        req.destroy();
        if (++n >= tries) return resolve(false);
        setTimeout(tick, 1000);
      };
      req.on("error", again);
      req.on("timeout", again);
    };
    tick();
  });
}

function kvPost(port, cmd) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: "/", method: "POST" }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data).result);
        } catch {
          reject(new Error(`fixture KV answered non-JSON: ${data.slice(0, 120)}`));
        }
      });
    });
    req.on("error", reject);
    req.end(JSON.stringify(cmd));
  });
}

/* the real operator mint (console-matrix.cjs's MINT_JS shape): one throwaway
   keypair feeds both OPERATOR_NPUBS and the browser cookie */
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
const { generateSecretKey, getPublicKey, nip19 } = await import("nostr-tools");
const sk = generateSecretKey();
const hex = getPublicKey(sk);
const { makeOperatorToken, OPERATOR_COOKIE } = await import(path.join(REPO, "src", "lib", "operator-auth.ts"));
process.stdout.write(JSON.stringify({ operatorNpub: nip19.npubEncode(hex), cookieName: OPERATOR_COOKIE, cookieValue: makeOperatorToken(hex) }));
`;

function mintOperator(repo, seatSecret) {
  const res = spawnSync(process.execPath, ["--input-type=module", "-e", MINT_JS], {
    cwd: repo,
    env: { ...process.env, SEAT_SECRET: seatSecret },
    encoding: "utf8",
  });
  if (res.status !== 0 || !res.stdout) throw new Error(`operator mint failed: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

/* ── the in-page probe (lifted from Lumen's walk probe, block 975,983, and
   turned into pass/fail) ─────────────────────────────────────────────── */
function probeInPage(minTap, minText) {
  const vw = innerWidth;
  const root = document.querySelector(".mgmt-shell") || document.querySelector("main") || document.body;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width <= 1 || r.height <= 1) return false; // sr-only and collapsed parts
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).display === "none") return false;
    }
    return true;
  };
  const name = (el) =>
    el.tagName.toLowerCase() +
    (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "") +
    " '" + (el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 32) + "'";
  const parse = (c) => {
    const m = (c || "").match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
  };
  /* the ground a field actually shows: its own background composited over
     its ancestors' until something opaque */
  const ground = (el) => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) {
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let out = { r: 0, g: 0, b: 0 };
    for (let i = layers.length - 1; i >= 0; i--) {
      const c = layers[i];
      out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
    }
    return (0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b) / 255;
  };
  /* a specimen of the PUBLIC site's own blocks (the Brand room's board) is
     the public page standard's business, not this walk's: counted apart */
  const sample = (el) => !!el.closest("[data-public-sample]");
  const all = [...root.querySelectorAll("*")].filter(vis).filter((el) => !sample(el));

  /* A1 fields */
  const fields = [...root.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=color]):not([type=file]), select, textarea")].filter(vis).filter((el) => !sample(el));
  const brightFields = fields.filter((el) => ground(el) > 0.6);

  /* A2 controls */
  const inlineLink = (el) => {
    if (el.tagName !== "A") return false;
    if (/\b(btn|kit-btn|pill|chip|tab)\b/.test(String(el.className))) return false;
    if (getComputedStyle(el).display !== "inline") return false;
    const p = el.parentElement;
    return !!p && [...p.childNodes].some((n) => n !== el && n.nodeType === 3 && n.textContent.trim().length > 1);
  };
  const controls = [...root.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=switch], [role=tab]")]
    .filter(vis)
    .filter((el) => !sample(el))
    .filter((el) => !inlineLink(el));
  const tapBox = (el) => {
    if (el.tagName === "INPUT" && /^(checkbox|radio)$/.test(el.type)) {
      const lab = el.closest("label") || (el.id && document.querySelector(`label[for="${el.id}"]`));
      if (lab && vis(lab)) return lab.getBoundingClientRect().height;
    }
    return el.getBoundingClientRect().height;
  };
  const smallControls = controls.filter((el) => tapBox(el) < minTap - 0.5);

  /* A3 text */
  const texts = all.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0));
  const tiny = texts.filter((el) => parseFloat(getComputedStyle(el).fontSize) < minText - 0.01);

  /* A4 sideways */
  const docW = document.documentElement.scrollWidth;
  const isField = (el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
  const scrollers = all.filter((el) => {
    if (isField(el)) return false;
    const ox = getComputedStyle(el).overflowX;
    return (ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1;
  });
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "hidden" || ox === "clip") {
        const r = p.getBoundingClientRect();
        if (r.right <= vw + 1) return true;
      }
    }
    return false;
  };
  const off = all.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.right > vw + 1 && r.left < vw && !clipped(el) && getComputedStyle(el).position !== "fixed";
  });
  const offLeaf = off.filter((el) => ![...el.children].some((c) => off.includes(c)));

  /* A7 census (reported, never failed): which button family each button in
     the room wears - kit (kit-btn / kit-ibtn / kit-tgl / kit-tab), the old
     btn family, or a one-off */
  const body = document.querySelector("main.mgmt-body") || root;
  const fam = { kit: 0, old: 0, oneOff: 0, oneOffFirst: [], oldFirst: [] };
  for (const el of [...body.querySelectorAll("button, a[class*=btn], [role=button]")].filter(vis)) {
    const toks = String(el.className || "").split(/\s+/);
    if (toks.some((t) => /^kit-(btn|ibtn|tgl|tab)$/.test(t))) fam.kit++;
    else if (toks.some((t) => t === "btn" || t.startsWith("btn-"))) {
      fam.old++;
      if (fam.oldFirst.length < 8) fam.oldFirst.push(name(el));
    } else {
      fam.oneOff++;
      if (fam.oneOffFirst.length < 12) fam.oneOffFirst.push(name(el));
    }
  }
  const h1 = (root.querySelector("h1")?.textContent || "").trim();
  const txt = document.body.innerText || "";
  return {
    url: location.pathname,
    vw,
    docW,
    pageH: document.documentElement.scrollHeight,
    publicSampleParts: root.querySelectorAll("[data-public-sample] *").length,
    h1,
    gate: /operator sign-in/i.test(txt) && !document.querySelector(".mgmt-shell"),
    fields: { n: fields.length, bright: brightFields.length, first: brightFields.slice(0, 8).map(name) },
    controls: { n: controls.length, under44: smallControls.length, first: smallControls.slice(0, 30).map((el) => name(el) + " h=" + Math.round(tapBox(el))) },
    text: {
      n: texts.length,
      under12: tiny.length,
      smallest: tiny.length ? Math.min(...tiny.map((el) => parseFloat(getComputedStyle(el).fontSize))) : null,
      first: tiny.slice(0, 40).map((el) => name(el) + " " + getComputedStyle(el).fontSize),
    },
    family: fam,
    sideways: {
      docOver: docW > vw,
      scrollers: scrollers.length,
      offEdge: offLeaf.length,
      first: [...scrollers.slice(0, 4).map((el) => "scrolls " + name(el)), ...offLeaf.slice(0, 6).map((el) => "off " + name(el) + " right=" + Math.round(el.getBoundingClientRect().right))],
    },
  };
}

/* pure: one room's probe → the reasons it fails (empty = pass) */
function judge(room, phone, desk) {
  const why = [];
  if (phone.gate) why.push("the operator gate showed, not the room");
  if (phone.fields.bright) why.push(`fields: ${phone.fields.bright} light-ground field(s) in night`);
  if (phone.controls.under44) why.push(`controls: ${phone.controls.under44} under ${MIN_TAP}px at 390`);
  if (phone.text.under12) why.push(`text: ${phone.text.under12} piece(s) under ${MIN_TEXT}px at 390 (smallest ${phone.text.smallest}px)`);
  if (desk && desk.text.under12) why.push(`text: ${desk.text.under12} piece(s) under ${MIN_TEXT}px at 1440 (smallest ${desk.text.smallest}px)`);
  if (phone.sideways.docOver) why.push(`sideways: the page is ${phone.docW}px on a ${phone.vw}px phone`);
  if (phone.sideways.scrollers) why.push(`sideways: ${phone.sideways.scrollers} part(s) scroll sideways`);
  if (phone.sideways.offEdge) why.push(`sideways: ${phone.sideways.offEdge} part(s) run off the right edge`);
  if (room.name && phone.h1.toLowerCase() !== room.name.toLowerCase()) why.push(`heading: says "${phone.h1}", not "${room.name}"`);
  return why;
}

async function setTheme(page, theme) {
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("oc-theme", t === "dawn" ? "light" : "dark");
    } catch {}
  }, theme);
}

async function openRoom(browser, base, cookie, route, viewport, theme) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await setTheme(page, theme);
  await page.setCookie({ name: cookie.name, value: cookie.value, domain: new URL(base).hostname, path: "/" });
  await page.goto(base + route, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate((t) => {
    if (t === "dawn") document.documentElement.setAttribute("data-oc-theme", "light");
    else document.documentElement.removeAttribute("data-oc-theme");
  }, theme);
  await sleep(900);
  return { ctx, page };
}

function loadPuppeteer() {
  if (!fs.existsSync(path.join(PUPPETEER, "package.json")) || !fs.existsSync(CHROME_BIN)) {
    console.error(`admin-walk.cjs: needs puppeteer at ${PUPPETEER} and chromium at ${CHROME_BIN} (borrowed, never a dependency)`);
    process.exit(2);
  }
  return require(PUPPETEER);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ports = parsePorts(args.ports);
  if (!ports || !args.out) {
    console.error("usage: node scripts/admin-walk.cjs --ports A-B --out <dir> [--repo <tree>] [--seed-kv <file>] [--extra-probe <file>] [--shots] [--only <routes>]");
    process.exit(2);
  }
  const repo = path.resolve(args.repo || path.join(SELF_DIR, ".."));
  if (!fs.existsSync(path.join(repo, ".next", "BUILD_ID"))) {
    console.error(`admin-walk.cjs: no build in ${repo}/.next — run NEXT_PUBLIC_CONSOLE_CHROME=site npx next build first`);
    process.exit(2);
  }
  for (const p of ports.all) {
    if (!(await portFree(p))) {
      console.error(`admin-walk.cjs: port ${p} is taken — refusing`);
      process.exit(2);
    }
  }
  const outDir = path.resolve(args.out);
  fs.mkdirSync(outDir, { recursive: true });
  let rooms = JSON.parse(fs.readFileSync(ROOMS_PATH, "utf8")).rooms;
  if (args.only) rooms = rooms.filter((r) => args.only.includes(r.route));
  const extraProbe = args.extraProbe ? fs.readFileSync(args.extraProbe, "utf8") : null;
  const puppeteer = loadPuppeteer();

  const seatSecret = `fixture-seat-${Date.now()}-${process.pid}`;
  let kv = null;
  let app = null;
  let browser = null;
  let code = 2;
  try {
    kv = spawn(process.execPath, [FIXTURE_KV], {
      env: { ...process.env, FIXTURE_KV_PORT: String(ports.kv) },
      stdio: ["ignore", fs.openSync(path.join(outDir, "kv.log"), "w"), "inherit"],
    });
    if (!(await waitHttp(ports.kv, 30))) throw new Error("the fixture KV never came up");
    if ((await kvPost(ports.kv, ["SET", SITE_CONFIG_KV_KEY, JSON.stringify(FIXTURE_SITE_CONFIG)])) !== "OK") throw new Error("site-config seed did not land");
    if (args.seedKv) {
      for (const cmd of JSON.parse(fs.readFileSync(args.seedKv, "utf8"))) await kvPost(ports.kv, cmd);
    }
    const mint = mintOperator(repo, seatSecret);
    const log = fs.openSync(path.join(outDir, "serve-app.log"), "w");
    app = spawn(path.join(repo, "node_modules", ".bin", "next"), ["start", "-p", String(ports.app), "-H", "127.0.0.1"], {
      cwd: repo,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: "production",
        SEAT_SECRET: seatSecret,
        KV_REST_API_URL: `http://127.0.0.1:${ports.kv}`,
        KV_REST_API_TOKEN: `fixture-kv-token-${process.pid}`,
        MATRIX_HOMESERVER: "http://127.0.0.1:1",
        MEMPOOL_NODE_URL: "http://127.0.0.1:1",
        OPERATOR_NPUBS: mint.operatorNpub,
      },
      stdio: ["ignore", log, log],
    });
    if (!(await waitHttp(ports.app, 90))) throw new Error(`next start never came up on ${ports.app}`);
    const base = `http://127.0.0.1:${ports.app}`;
    const cookie = { name: mint.cookieName, value: mint.cookieValue };
    if (args.serve) {
      fs.writeFileSync(path.join(outDir, "serve.json"), JSON.stringify({ base, cookie }, null, 2));
      console.log(`serving the fixture at ${base} · ${path.join(outDir, "serve.json")} · Ctrl-C to stop`);
      await new Promise((resolve) => {
        process.once("SIGINT", resolve);
        process.once("SIGTERM", resolve);
      });
      code = 0;
      return;
    }
    browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: "new", args: ["--no-sandbox", "--force-device-scale-factor=1"] });

    const report = { repo, at: new Date().toISOString(), rooms: [] };
    for (const room of rooms) {
      const slug = room.route.replace(/^\//, "").replace(/\//g, "_") || "a";
      const { ctx, page } = await openRoom(browser, base, cookie, room.route, PHONE, "dark");
      const phone = await page.evaluate(probeInPage, MIN_TAP, MIN_TEXT);
      let extra = null;
      if (extraProbe) extra = JSON.parse(await page.evaluate(`(${extraProbe})()`));
      await ctx.close();
      const d = await openRoom(browser, base, cookie, room.route, DESK, "dark");
      const desk = await d.page.evaluate(probeInPage, MIN_TAP, MIN_TEXT);
      await d.ctx.close();
      const fails = judge(room, phone, desk);
      report.rooms.push({ route: room.route, name: room.name, pass: fails.length === 0, fails, phone, desk, extra });
      console.log(`${fails.length ? "FAIL" : "pass"} ${room.route}${fails.length ? "  " + fails.join("; ") : ""}`);

      if (args.shots && !room.private) {
        for (const [wname, vp] of [["390", PHONE], ["1440", DESK]]) {
          for (const theme of ["dark", "dawn"]) {
            const s = await openRoom(browser, base, cookie, room.route, vp, theme);
            const h = await s.page.evaluate(() => document.documentElement.scrollHeight);
            const file = path.join(outDir, `${slug}.${wname}.${theme === "dark" ? "night" : "dawn"}.png`);
            await s.page.screenshot({ path: file, clip: { x: 0, y: 0, width: vp.width, height: Math.min(h, args.shotMax) }, captureBeyondViewport: true });
            await s.ctx.close();
          }
        }
      }
    }
    const failed = report.rooms.filter((r) => !r.pass);
    report.summary = { rooms: report.rooms.length, failed: failed.length };
    fs.writeFileSync(path.join(outDir, "admin-walk.json"), JSON.stringify(report, null, 2));
    console.log(`\n${report.rooms.length - failed.length} of ${report.rooms.length} rooms pass · report ${path.join(outDir, "admin-walk.json")}`);
    code = failed.length ? 1 : 0;
  } catch (e) {
    console.error(`admin-walk.cjs: ${e && e.stack ? e.stack : e}`);
    code = 2;
  } finally {
    if (browser) await browser.close().catch(() => {});
    for (const c of [app, kv]) if (c) c.kill("SIGTERM");
    await sleep(500);
    for (const p of ports.all) {
      const r = spawnSync("ss", ["-tlnpH", `sport = :${p}`], { encoding: "utf8" });
      const m = (r.stdout || "").match(/pid=(\d+)/);
      if (m) {
        try {
          process.kill(Number(m[1]), "SIGTERM");
        } catch {}
      }
    }
  }
  process.exit(code);
}

if (require.main === module) main();
module.exports = { judge, probeInPage, parsePorts };
