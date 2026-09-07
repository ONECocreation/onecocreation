/**
 * Cartridge-identity harness — the dressing room's write rail, proven
 * (S8 lane 3's throwaway harness — 32 passed — made permanent and extended
 * in S9 for the finished dressing room, 0018.05.28 a₿).
 *
 * Run from the repo root:  node scripts/cartridge-identity.test.mjs
 *
 * How it works: the rail addresses the cartridge as
 * process.cwd()/src/brand/cartridge.ts, so the harness copies the REAL
 * cartridge.ts (post-registry, Lane 2's shape) into a temp dir, chdirs
 * there, and lets every write land on the copy — the repo's own file is
 * never touched. The harness carries its OWN copy of the anchor table:
 * asserting each anchor matches the real file EXACTLY once is the explicit
 * exactly-once proof, and the originals it extracts feed the strongest
 * assertions — the round trips: write a dressed value, write the original
 * back through the rail, and the file must be BYTE-IDENTICAL to pristine.
 *
 * S10 (the cartridge becomes a choice) extended it: `cartridge.id` writes
 * the selection line, and its lawful values are the registry's own ids —
 * the harness derives that list from the file's own `CartridgeId` union
 * (never re-types it), writes every id, and proves an unknown id — and a
 * missing list — are refused before disk is touched. S10's cleanup lane
 * added `meta.themeColor`: the browser-chrome tint, exactly #rrggbb or
 * refused (red, #fff, #1234567 all rejected before disk).
 */

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const pristine = readFileSync(path.join(root, "src", "brand", "cartridge.ts"), "utf8");

const work = mkdtempSync(path.join(tmpdir(), "oc-dressing-"));
mkdirSync(path.join(work, "src", "brand"), { recursive: true });
const cartFile = path.join(work, "src", "brand", "cartridge.ts");
const reset = () => writeFileSync(cartFile, pristine);
const onDisk = () => readFileSync(cartFile, "utf8");
reset();
process.chdir(work);

const {
  IDENTITY_FIELDS, writeIdentityField,
  writeVoiceRow, isVoiceRow, VOICE_LIMIT,
} = await import(path.join(root, "src", "lib", "cartridge-identity.ts"));

let passed = 0, failed = 0;
function t(name, cond, extra = "") {
  if (cond) { passed++; }
  else { failed++; console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`); }
}

/* ── the harness's own anchor table (mirrors SPECS in the rail) ───────── */
const ANCHORS = {
  "cartridge.id":       /(export const activeCartridgeId: CartridgeId = ")([^"]*)(";)/,
  "logo.lockup":        /(lockup:\s*")([^"]*)(")/,
  "logo.mark":          /(mark:\s*")([^"]*)(")/,
  "logo.consciouscuts": /(consciouscuts:\s*")([^"]*)(")/,
  "hero.moon":          /(moon:\s*")([^"]*)(")/,
  "hero.nebula":        /(nebula:\s*")([^"]*)(")/,
  "hero.meteors":       /(meteors:\s*")([^"]*)(")/,
  "hero.heavenEarth":   /(heavenEarth:\s*")([^"]*)(")/,
  "hero.loveSidelook":  /(loveSidelook:\s*")([^"]*)(")/,
  "hero.lionsGate":     /(lionsGate:\s*")([^"]*)(")/,
  "doors.timeTipUrl":   /(timeTipUrl:\s*")([^"]*)(")/,
  "copy.productName":   /(productName:\s*")([^"]*)(")/,
  "copy.tagline":       /(tagline:\s*")([^"]*)(")/,
  "copy.memberNoun":    /(memberNoun:\s*")([^"]*)(")/,
  "nav.accent":         /(accent:\s*")([^"]*)(" as "gold" \| "dawn")/,
  "signIn.copy.returningTitle": /(returningTitle:\s*")([^"]*)(")/,
  "signIn.copy.returningBlurb": /(returningBlurb:\s*")([^"]*)(")/,
  "signIn.copy.signInCta":      /(signInCta:\s*")([^"]*)(")/,
  "signIn.copy.signingCta":     /(signingCta:\s*")([^"]*)(")/,
  "signIn.copy.doorsHeading":   /(doorsHeading:\s*")([^"]*)(")/,
  "signIn.copy.doorsFootnote":  /(doorsFootnote:\s*")([^"]*)(")/,
  "meta.title":         /(title:\s*")([^"]*)(")/,
  "meta.description":   /(description:\s*")([^"]*)(")/,
  "meta.themeColor":    /(    themeColor:\s*")([^"]*)(")/,
  "portraits.headshot":   /(headshot:\s*")([^"]*)(")/,
  "portraits.cuts.women": /(      women:\s*")([^"]*)(")/,
  "portraits.cuts.wax":   /(      wax:\s*")([^"]*)(")/,
  "portraits.cuts.men":   /(      men:\s*")([^"]*)(")/,
  "tierArt.A": /(    A:\s*")([^"]*)(")/,
  "tierArt.B": /(    B:\s*")([^"]*)(")/,
  "tierArt.C": /(    C:\s*")([^"]*)(")/,
  "thanks.video":   /(video:\s*")([^"]*)(")/,
  "thanks.poster":  /(poster:\s*")([^"]*)(")/,
  "thanks.heading": /(heading:\s*")([^"]*)(")/,
  "thanks.message": /(message:\s*")([^"]*)(")/,
};

/* the explicit exactly-once proof, run against the REAL cartridge.ts —
   and the originals, read independently of the rail */
const originals = {};
for (const f of IDENTITY_FIELDS) {
  const a = ANCHORS[f];
  const found = pristine.match(new RegExp(a.source, "g")) ?? [];
  t(`anchor exactly-once: ${f}`, found.length === 1, `matched ${found.length}`);
  originals[f] = pristine.match(a)?.[2];
}
t("the rail's field list and the anchor table agree",
  IDENTITY_FIELDS.every((f) => f in ANCHORS) && Object.keys(ANCHORS).every((f) => (IDENTITY_FIELDS).includes(f)));

/* the registry's ids, derived from the file's own union — never re-typed,
   so a fourth cartridge extends this harness the day it joins the type */
const IDS = (pristine.match(/export type CartridgeId = ([^;]+);/)?.[1].match(/"([^"]+)"/g) ?? [])
  .map((s) => s.slice(1, -1));
t("the harness derives the cartridge ids from the real union", IDS.length >= 3, IDS.join(", "));

/* ── good writes, every field, each round-tripped byte-identically ────── */
/* `$&` and `$1` ride the dressed values: the rail must pour them
   LITERALLY, never interpret */
const ASSET = "/images/dressing-room-$&-test.webp";
const COPY = "Dressed $& anew $1";
const GOOD = {
  "cartridge.id": IDS[1] ?? "pacman",
  "doors.timeTipUrl": "https://time.example.org/api/chain/tip?full=1",
  "nav.accent": "dawn",
  "meta.description": "A search snippet runs longer than a copy token — this one is a hundred and thirty characters on purpose, to prove the raised ceiling. $&",
  "meta.themeColor": "#1234AB", /* mixed case on purpose — the hex law takes either */
};
const goodValue = (f) =>
  GOOD[f] ??
  (f.startsWith("logo.") || f.startsWith("hero.") || f.startsWith("portraits.") || f.startsWith("tierArt.") || f === "thanks.video" || f === "thanks.poster" ? ASSET : COPY);

for (const field of IDENTITY_FIELDS) {
  reset();
  const w = await writeIdentityField(field, goodValue(field), IDS);
  t(`write ${field} lands`, w.ok === true && onDisk().includes(goodValue(field)), !w.ok && w.reason);
  const back = await writeIdentityField(field, originals[field], IDS);
  t(`write ${field} round-trips byte-identically`, back.ok === true && onDisk() === pristine);
}

/* ── the cartridge choice — every id in the union lands, nothing else ── */
for (const id of IDS) {
  reset();
  const w = await writeIdentityField("cartridge.id", id, IDS);
  t(`write cartridge.id ← ${id} lands`, w.ok === true && onDisk().includes(`activeCartridgeId: CartridgeId = "${id}";`), !w.ok && w.reason);
  const back = await writeIdentityField("cartridge.id", originals["cartridge.id"], IDS);
  t(`cartridge.id ← ${id} round-trips byte-identically`, back.ok === true && onDisk() === pristine);
}
reset();
{
  const w = await writeIdentityField("cartridge.id", "sega", IDS);
  t("an unknown cartridge is refused before disk, file untouched",
    w.ok === false && w.status === 400 && onDisk() === pristine, w.ok ? "accepted!" : w.reason);
}
{
  const w = await writeIdentityField("cartridge.id", IDS[1]);
  t("without the registry's list the rail refuses honestly, file untouched",
    w.ok === false && w.status === 400 && onDisk() === pristine, w.ok ? "accepted!" : w.reason);
}

/* the time door may also sail empty */
reset();
t("timeTipUrl accepts the empty string", (await writeIdentityField("doors.timeTipUrl", "")).ok === true);

/* ── validation rejects, before disk, file untouched ──────────────────── */
const REJECTS = [
  ["logo.lockup", "images/no-leading-slash.webp"],
  ["logo.lockup", "/" + "x".repeat(241)],
  ["logo.lockup", '/bad"quote.webp'],
  ["logo.lockup", "/bad\\backslash.webp"],
  ["logo.lockup", "/bad\nline.webp"],
  ["doors.timeTipUrl", "http://insecure.example.org"],
  ["doors.timeTipUrl", "not a url at all"],
  ["copy.tagline", ""],
  ["copy.tagline", "x".repeat(121)],
  ["copy.tagline", 'bad "quote"'],
  ["copy.tagline", "bad\\backslash"],
  ["copy.tagline", "bad\nline"],
  ["nav.accent", "pink"],
  ["nav.accent", ""],
  ["meta.description", ""],
  ["meta.description", "x".repeat(241)],
  ["meta.themeColor", "red"],
  ["meta.themeColor", "#fff"],
  ["meta.themeColor", "#1234567"],
  ["meta.themeColor", "#12345g"],
];
for (const [field, value] of REJECTS) {
  reset();
  const w = await writeIdentityField(field, value);
  t(`reject ${field} ← ${JSON.stringify(value.length > 24 ? value.slice(0, 24) + "…" : value)}`,
    w.ok === false && w.status === 400 && onDisk() === pristine, w.ok ? "accepted!" : w.reason);
}

/* the raised ceiling is THIS field's alone: 121 chars passes meta.description… */
reset();
t("meta.description takes 121 characters", (await writeIdentityField("meta.description", "x".repeat(121))).ok === true);
/* …while copyLine still refuses it (copy.tagline ← 121×x, above) */

/* ── the exactly-once guard fails honestly on drift ───────────────────── */
reset();
writeFileSync(cartFile, pristine.replace(
  'consciouscuts: "/brand/consciouscuts-logo.png",',
  'consciouscuts: "/brand/consciouscuts-logo.png",\n    lockup: "/brand/onecocreation-lockup-raylit.svg",',
));
{
  const w = await writeIdentityField("logo.lockup", ASSET);
  t("doubled anchor → honest drift error, file untouched",
    w.ok === false && w.status === 500 && /matched 2 times/.test(w.ok ? "" : w.reason) && onDisk() !== pristine);
}

/* ── a read-only deployment says no, honestly ─────────────────────────── */
reset();
chmodSync(cartFile, 0o444);
{
  let w;
  try { w = await writeIdentityField("copy.tagline", COPY); }
  catch (e) { w = { threw: e }; }
  t("read-only FS → structured error, never a thrown surprise",
    w && w.ok === false && w.status === 500 && /read-only/.test(w.reason));
}
chmodSync(cartFile, 0o644);

/* ── VOICES — the bounded list ────────────────────────────────────────── */
const VOICE_ROW = /    \{ quote: "([^"\\]*)", name: "([^"\\]*)", who: "([^"\\]*)", href: "([^"\\]*)" \},\n/g;
const VOICES = [...pristine.matchAll(VOICE_ROW)].map((m) => ({ quote: m[1], name: m[2], who: m[3], href: m[4] }));
t("the real shelf parses, every row", VOICES.length >= 1);
const NEW_VOICE = { quote: "A new voice $& rings true", name: "Testa", who: "@testa", href: "https://www.youtube.com/watch?v=test123" };

t("isVoiceRow accepts a full row", isVoiceRow(NEW_VOICE) === true);
t("isVoiceRow refuses a short row", isVoiceRow({ quote: "x", name: "y", who: "z" }) === false);

reset();
{
  const w = await writeVoiceRow("add", -1, NEW_VOICE);
  t("voice add lands at the foot of the shelf", w.ok === true && w.index === VOICES.length && onDisk().includes('name: "Testa"'), !w.ok && w.reason);
  const back = await writeVoiceRow("remove", VOICES.length);
  t("voice remove round-trips byte-identically", back.ok === true && onDisk() === pristine);
}

reset();
{
  const edited = { ...VOICES[0], quote: "An edited quote, still honest" };
  const w = await writeVoiceRow("edit", 0, edited);
  t("voice edit lands on the named row", w.ok === true && onDisk().includes('quote: "An edited quote, still honest"') && onDisk().includes(`name: "${VOICES[1].name}"`), !w.ok && w.reason);
  const back = await writeVoiceRow("edit", 0, VOICES[0]);
  t("voice edit round-trips byte-identically", back.ok === true && onDisk() === pristine);
}

reset();
{
  const last = VOICES[VOICES.length - 1];
  const w = await writeVoiceRow("remove", VOICES.length - 1);
  t("voice remove takes the named row off", w.ok === true && !onDisk().includes(`name: "${last.name}"`), !w.ok && w.reason);
  const back = await writeVoiceRow("add", -1, last);
  t("remove-then-add round-trips byte-identically", back.ok === true && onDisk() === pristine);
}

/* the shelf can empty and fill again — the block anchor uses `*`, not `+` */
reset();
{
  let ok = true;
  for (let i = VOICES.length - 1; i >= 0; i--) ok = (await writeVoiceRow("remove", i)).ok === true && ok;
  t("the shelf empties, voice by voice", ok && /voices: \[\n  \],/.test(onDisk()));
  for (const v of VOICES) ok = (await writeVoiceRow("add", -1, v)).ok === true && ok;
  t("the shelf refills byte-identically", ok && onDisk() === pristine);
}

/* the bound holds */
reset();
{
  let ok = true;
  for (let i = VOICES.length; i < VOICE_LIMIT; i++) {
    ok = (await writeVoiceRow("add", -1, { ...NEW_VOICE, name: `Testa${i}` })).ok === true && ok;
  }
  t(`the shelf fills to its bound (${VOICE_LIMIT})`, ok);
  const over = await writeVoiceRow("add", -1, NEW_VOICE);
  t("one voice past the bound is refused, honestly", over.ok === false && over.status === 400 && /holds/.test(over.ok ? "" : over.reason));
}

/* index discipline + validation before disk */
reset();
t("edit past the shelf's end is refused", (await writeVoiceRow("edit", 99, NEW_VOICE)).ok === false);
t("remove at a negative index is refused", (await writeVoiceRow("remove", -1)).ok === false);
{
  const bad = await writeVoiceRow("add", -1, { ...NEW_VOICE, href: "http://insecure.example.org" });
  t("a voice without an https home is refused, file untouched", bad.ok === false && bad.status === 400 && onDisk() === pristine);
}
{
  const bad = await writeVoiceRow("add", -1, { ...NEW_VOICE, quote: 'a "quoted" quote' });
  t("a quote with a quote in it is refused, file untouched", bad.ok === false && bad.status === 400 && onDisk() === pristine);
}
t("an edit without a row is refused", (await writeVoiceRow("edit", 0)).ok === false);

/* the block's own exactly-once guard: a corrupt copy holding TWO voices blocks */
reset();
{
  const m = pristine.match(/(  voices: \[\n(?:    \{.*\},\n)*  \],\n)/);
  t("the harness found the real voices block to double", m !== null);
  writeFileSync(cartFile, pristine.replace(m[1], m[1] + "\n" + m[1]));
  const w = await writeVoiceRow("add", -1, NEW_VOICE);
  t("doubled voices block → honest drift error", w.ok === false && w.status === 500 && /matched 2 times/.test(w.ok ? "" : w.reason));
}

/* ── TASK-121 THE PINK PASS — every rose-on-wash text pair ≥ 4.5:1, BOTH
   themes (spec step 5), plus the --warn byte-identity guard (spec step 1's
   cartridge.css:36-37 note). Reads the REAL token values out of
   cartridge.css and the REAL wash literals out of house.css — no re-typed
   copies to drift. WCAG relative luminance throughout. ── */
{
  const css = readFileSync(path.join(root, "src", "app", "cartridge.css"), "utf8");
  const house = readFileSync(path.join(root, "src", "app", "house.css"), "utf8");
  const darkBlock = css.match(/:root,\.oc-pv-dark\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const dawnBlock = css.match(/html\[data-oc-theme="light"\],\.oc-pv-light\{([\s\S]*?)\n\}/)?.[1] ?? "";
  t("the harness found both theme blocks", darkBlock.length > 100 && dawnBlock.length > 100);

  const rawTok = (block, name) => block.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))?.[1].trim();
  /* dawn falls back to the night value when it doesn't override a token */
  const tok = (name, theme, depth = 0) => {
    const v = (theme === "dawn" ? rawTok(dawnBlock, name) : undefined) ?? rawTok(darkBlock, name);
    const ref = v?.match(/^var\(--([\w-]+)\)$/)?.[1];
    return ref && depth < 4 ? tok(ref, theme, depth + 1) : v;
  };
  const lum = (hex) => {
    const c = hex.replace("#", "").toLowerCase();
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(parseInt(c.slice(0, 2), 16)) + 0.7152 * f(parseInt(c.slice(2, 4), 16)) + 0.0722 * f(parseInt(c.slice(4, 6), 16));
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const over = (rgba, bg) => { /* rgba(r,g,b,a) composited on #rrggbb */
    const m = rgba.match(/rgba?\(([\d.]+),([\d.]+),([\d.]+)(?:,([\d.]+))?\)/);
    const a = m[4] === undefined ? 1 : parseFloat(m[4]);
    const ch = (i) => Math.round(parseFloat(m[i]) * a + parseInt(bg.replace("#", "").slice((i - 1) * 2, i * 2), 16) * (1 - a));
    return "#" + [ch(1), ch(2), ch(3)].map((v) => v.toString(16).padStart(2, "0")).join("");
  };
  const pair = (name, fg, bg) => {
    const r = ratio(fg, bg);
    t(`rose pair ≥4.5:1 — ${name} (${r.toFixed(2)}:1)`, r >= 4.5, `${fg} on ${bg}`);
  };

  const GROUND = { dark: tok("ground", "dark"), dawn: tok("ground", "dawn") };
  const lockRule = house.match(/\.lockpill\{([^}]*)\}/)?.[1] ?? "";
  const lockWash = lockRule.match(/background:\s*(rgba?\([^)]*\))/)?.[1];
  const lockInkTok = lockRule.match(/color:\s*var\(--([\w-]+)\)/)?.[1];
  const clsRule = css.match(/#classes \.lockpill\{([^}]*)\}/)?.[1] ?? "";
  const clsWash = clsRule.match(/background:\s*(rgba?\([^)]*\))/)?.[1];
  const clsInk = clsRule.match(/color:\s*(#[0-9a-fA-F]{6})/)?.[1];
  t("the harness read both lockpill washes + inks", !!(lockWash && lockInkTok && clsWash && clsInk),
    `${lockWash} / ${lockInkTok} / ${clsWash} / ${clsInk}`);

  for (const theme of ["dark", "dawn"]) {
    /* the fills: plum --gold-ink on BOTH rose gradient stops */
    pair(`${theme}: --gold-ink on the light fill end (--gold-2)`, tok("gold-ink", theme), tok("gold-2", theme));
    pair(`${theme}: --gold-ink on the deep fill end (--gold)`, tok("gold-ink", theme), tok("gold", theme));
    /* the text rung on the theme ground */
    pair(`${theme}: --gold-deep text on the ground`, tok("gold-deep", theme), GROUND[theme]);
    /* rose-on-wash: the shared lockpill + the classes card's own wash —
       dark composites on the night ground, dawn on the cream card */
    const cardGround = theme === "dark" ? GROUND.dark : "#FCF7F0";
    pair(`${theme}: .lockpill --gold-wash-ink on its rose wash`, tok(lockInkTok, theme), over(lockWash, cardGround));
    pair(`${theme}: #classes .lockpill ink on its rose wash (cream card both themes)`, clsInk, over(clsWash, "#FCF7F0"));
    /* spec step 1's note: --warn must never land byte-identical to a rose */
    const roses = ["gold", "gold-2", "gold-deep", "rose", "rose-soft"].map((n) => tok(n, theme)?.toLowerCase());
    t(`${theme}: --warn is byte-distinct from every rose value`, !roses.includes(tok("warn", theme)?.toLowerCase()),
      `--warn=${tok("warn", theme)} roses=${roses.join(",")}`);
  }
  /* the merge itself, said out loud: gold IS rose now, per theme */
  t("dark: --gold pours --rose exactly", tok("gold", "dark")?.toLowerCase() === tok("rose", "dark")?.toLowerCase());
  t("dawn: --gold-deep pours the dawn --rose exactly", tok("gold-deep", "dawn")?.toLowerCase() === tok("rose", "dawn")?.toLowerCase());
}

rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
