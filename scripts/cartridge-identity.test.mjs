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

/* ── good writes, every field, each round-tripped byte-identically ────── */
/* `$&` and `$1` ride the dressed values: the rail must pour them
   LITERALLY, never interpret */
const ASSET = "/images/dressing-room-$&-test.webp";
const COPY = "Dressed $& anew $1";
const GOOD = {
  "doors.timeTipUrl": "https://time.example.org/api/chain/tip?full=1",
  "nav.accent": "dawn",
  "meta.description": "A search snippet runs longer than a copy token — this one is a hundred and thirty characters on purpose, to prove the raised ceiling. $&",
};
const goodValue = (f) =>
  GOOD[f] ??
  (f.startsWith("logo.") || f.startsWith("hero.") || f.startsWith("portraits.") || f.startsWith("tierArt.") || f === "thanks.video" || f === "thanks.poster" ? ASSET : COPY);

for (const field of IDENTITY_FIELDS) {
  reset();
  const w = await writeIdentityField(field, goodValue(field));
  t(`write ${field} lands`, w.ok === true && onDisk().includes(goodValue(field)), !w.ok && w.reason);
  const back = await writeIdentityField(field, originals[field]);
  t(`write ${field} round-trips byte-identically`, back.ok === true && onDisk() === pristine);
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

rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
