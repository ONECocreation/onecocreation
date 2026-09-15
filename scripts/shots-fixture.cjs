#!/usr/bin/env node
/**
 * scripts/shots-fixture.cjs — TASK-282 unified shot driver (pickup-feedback
 * tune 2). Puppeteer is borrowed at runtime from puck-studio's node_modules
 * (never a dependency of this repo) + the system chromium binary. Every
 * server address this file talks to arrives as a `--base`/`--tenant-base`
 * argument from scripts/shots-fixture.sh — this file never binds a port
 * itself and never hardcodes one (the vitest pin in
 * tests/shots-fixture-harness.test.ts checks that).
 *
 * Three lessons carried in from the archived per-lane harnesses this
 * replaces (T-210…T-232 rebuilt this by hand every time):
 *
 *  - task-277/shoot-277.cjs — the theme toggle: stamp `data-oc-theme` on
 *    <html> and mirror it into the `oc-theme` localStorage key so a reload
 *    mid-session would still land on the right theme.
 *  - task-280/shoot-280.cjs — wait past PopupHost's ~2000ms fire delay and
 *    press Escape once before the shot (src/components/PopupHost.tsx);
 *    and the TWO-BROWSER-CONTEXT fix: puppeteer shares cookies across
 *    every page within ONE context, so a signed-in shot run in the same
 *    context as a signed-out one would silently sign in every later page.
 *    Any cookie'd run gets its own incognito context; cookie:none runs
 *    stay on the default (never-touched-by-setCookie) context.
 *  - task-276/shoot-276.cjs — a second base URL (`--tenant-base`) for
 *    `/u/*` routes, so a TENANT override doesn't collide with the default
 *    tenant's `/u/[handle]` → `/me` redirect eating the profile route.
 */
"use strict";

const path = require("node:path");
const fs = require("node:fs");

const PUPPETEER = "/home/pac/dev/apps/puck-studio/node_modules/puppeteer";
const CHROME = "/usr/bin/chromium";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    out[a.slice(2)] = argv[i + 1];
    i++;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const BASE = args.base;
const TENANT_BASE = args["tenant-base"] || null;
const OUT = args.out;
const ROUTES = (args.routes || "").split(",").map((r) => r.trim()).filter(Boolean);
const THEMES = (args.themes || "dark,dawn").split(",").map((t) => t.trim()).filter(Boolean);
const WIDTHS = (args.widths || "1440,390").split(",").map((w) => Number(w.trim())).filter((n) => Number.isFinite(n) && n > 0);
const COOKIE_NAME = args["cookie-name"] || null;
const COOKIE_VALUE = args["cookie-value"] || null;
const CLICK_SEL = args.click || null;

if (!BASE || !OUT || !ROUTES.length || !WIDTHS.length) {
  console.error("shots-fixture.cjs: --base, --out and --routes (with a non-empty --widths) are required");
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** "/" -> "home", "/a/connections" -> "a-connections", "/u/pacster" -> "u-pacster" */
function slugFor(route) {
  const trimmed = route.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "home" : trimmed.replace(/\//g, "-");
}

/** Mobile widths get the portrait phone frame; every other width gets the
 *  desktop frame (matches the three archived harnesses' own convention). */
function heightFor(width) {
  return width === 390 ? 844 : 1100;
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    try {
      localStorage.setItem("oc-theme", t === "dawn" ? "light" : "dark");
    } catch {
      /* private mode — the attribute below still drives the visible shot */
    }
    if (t === "dawn") document.documentElement.setAttribute("data-oc-theme", "light");
    else document.documentElement.removeAttribute("data-oc-theme");
  }, theme);
  await sleep(400);
}

async function dismissPopup(page) {
  // PopupHost fires ~2000ms after load, oncePerSession — wait past it and
  // press Escape once so it never covers the surface in frame. A safe
  // no-op on every route PopupHost never mounts on (e.g. /a/*).
  await sleep(2200);
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(300);
}

async function shootOne(ctx, base, route, theme, width, cookie) {
  const vp = { width, height: heightFor(width), deviceScaleFactor: 1 };
  const page = await ctx.newPage();
  if (cookie) {
    const host = new URL(base).hostname;
    await page.setCookie({ name: cookie.name, value: cookie.value, domain: host, path: "/" });
  }
  await page.setViewport(vp);
  const resp = await page.goto(`${base}${route}`, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(1000);
  await dismissPopup(page);
  await setTheme(page, theme);
  await sleep(300);

  const slug = slugFor(route);
  const title = await page.title().catch(() => "");
  const h1 = await page
    .evaluate(() => document.querySelector("h1")?.textContent?.trim() || "")
    .catch(() => "");
  const file = `${slug}-${theme}-${width}.png`;
  console.log(`shot ${file} — status ${resp ? resp.status() : "?"} — title "${title}" — h1 "${h1}"`);
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });

  if (CLICK_SEL) {
    const clicked = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el instanceof HTMLElement) {
        el.click();
        return true;
      }
      return false;
    }, CLICK_SEL);
    await sleep(700);
    const clickTitle = await page.title().catch(() => "");
    const clickH1 = await page
      .evaluate(() => document.querySelector("h1")?.textContent?.trim() || "")
      .catch(() => "");
    const clickFile = `${slug}-${theme}-${width}-click.png`;
    console.log(
      `shot ${clickFile} — status ${resp ? resp.status() : "?"} — clicked "${CLICK_SEL}": ${clicked} — title "${clickTitle}" — h1 "${clickH1}"`
    );
    await page.screenshot({ path: path.join(OUT, clickFile), fullPage: false });
  }

  await page.close();
}

async function main() {
  const puppeteer = require(PUPPETEER);
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--force-device-scale-factor=1"],
  });

  const signedOutCtx = browser.defaultBrowserContext();
  const cookie = COOKIE_NAME && COOKIE_VALUE ? { name: COOKIE_NAME, value: COOKIE_VALUE } : null;
  // any cookie'd run gets a FRESH incognito context — never the default
  // context puppeteer shares across every page (task-280's lesson).
  const cookieCtx = cookie ? await browser.createBrowserContext() : null;
  const ctx = cookie ? cookieCtx : signedOutCtx;

  for (const route of ROUTES) {
    const useTenant = TENANT_BASE && route.startsWith("/u/");
    const base = useTenant ? TENANT_BASE : BASE;
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        await shootOne(ctx, base, route, theme, width, cookie);
      }
    }
  }

  if (cookieCtx) await cookieCtx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
