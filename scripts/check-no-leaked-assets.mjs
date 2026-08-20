/**
 * No-leaked-assets guard — the CONTENT tripwire (TASK-11/S13 lane 3,
 * 0018.05.26 a₿).
 *
 * Why this exists: src/app/apple-icon.png spent months byte-identical to
 * another project's icon, and every grep-based audit was structurally blind
 * to it — Next.js serves `apple-icon.png`, `favicon.ico` and friends by
 * filename CONVENTION, so a leaked asset can sit in the tree with zero
 * imports and zero references. The only honest check is on CONTENT, never
 * on names: hash every binary asset and compare against the hashes of
 * known leaks.
 *
 * What it does: walks src/app/ and public/ recursively, sha256-hashes every
 * file whose extension is in the binary-asset allowlist below, and fails
 * (exit 1, naming the file AND which known leak it matches) if any hash
 * appears in KNOWN_LEAKS. Exit 0 with a one-line summary when clean.
 *
 * KNOWN_LEAKS is INSTITUTIONAL MEMORY, not a to-do list: an entry stays
 * after the leaked file itself is replaced, because the entry is what a
 * leak LOOKS LIKE. If the same bytes ever drift back in — a careless copy,
 * a transplant, a restore from an old backup — the trap trips again.
 *
 * Dependency-free (node stdlib only). Run from the repo root:
 *   node scripts/check-no-leaked-assets.mjs   (or: npm run check:leaks)
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* The roots that ship assets: src/app (Next's convention-served files —
   the blind spot this guard exists for) and public/ (served verbatim). */
const ROOTS = ["src/app", "public"];

/* The binary-asset allowlist — the kinds of file that can carry a leak:
   images (.png .jpg .jpeg .gif .webp .avif .ico .svg), video (.mp4 .webm
   .mov .m4v), audio (.mp3 .wav .ogg .m4a .flac .aac), fonts (.woff .woff2
   .ttf .otf .eot), archives (.zip .tar .gz .tgz .7z .rar). Text sources
   (.ts, .css, .md…) are grep-able already; this net is for what grep
   cannot see. */
const ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".svg",
  ".mp4", ".webm", ".mov", ".m4v",
  ".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".zip", ".tar", ".gz", ".tgz", ".7z", ".rar",
]);

/* hash → what the leak IS. Append, never prune: a replaced leak stays on
   record so its bytes can never quietly return. */
const KNOWN_LEAKS = new Map([
  [
    "95a7849ab92e3cccdbd3d2b91bf9dca53f86700e1521797c80912ea6988f6c88",
    "the frens.earth apple-icon — served byte-identical here for months " +
      "because Next.js serves apple-icon.png by convention, invisible to " +
      "every reference-based audit (TASK-11/S13; lane 1 replaced the file, " +
      "this entry stays as the memory of what a leak looks like)",
  ],
]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const started = performance.now();
let hashed = 0;
const hits = [];

for (const rel of ROOTS) {
  for (const file of walk(join(root, rel))) {
    if (!ASSET_EXTENSIONS.has(extname(file).toLowerCase())) continue;
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
    hashed++;
    const leak = KNOWN_LEAKS.get(hash);
    if (leak) hits.push({ file: relative(root, file), hash, leak });
  }
}

const elapsed = Math.round(performance.now() - started);

if (hits.length > 0) {
  console.error(`[check-no-leaked-assets] LEAK — ${hits.length} file(s) match a known leak:`);
  for (const { file, hash, leak } of hits) {
    console.error(`[check-no-leaked-assets]   ${file}`);
    console.error(`[check-no-leaked-assets]     sha256 ${hash}`);
    console.error(`[check-no-leaked-assets]     matches: ${leak}`);
  }
  process.exit(1);
}

console.log(`[check-no-leaked-assets] clean — ${hashed} assets hashed in ${elapsed}ms, no known leaks present.`);
