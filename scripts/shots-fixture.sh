#!/bin/bash
# ============================================================================
# scripts/shots-fixture.sh — ONE Cocreation's unified shot-fixture harness
# (TASK-282, pickup-feedback tune 2, 0018.06.25 a₿). Every lane since T-210
# rebuilt the same fixture harness from an archived outbox by hand; T-232
# lost a run to a port collision. This is the ONE reviewable harness.
#
# It builds (once) and serves a PRODUCTION `next start` against a throwaway
# fixture KV and a throwaway SEAT_SECRET, mints the requested fixture
# cookie with the REAL src/lib/member-auth.ts `makeMemberToken` / real
# src/lib/operator-auth.ts `makeOperatorToken` (never a hand-rolled
# duplicate of the HMAC shape), drives scripts/shots-fixture.cjs (puppeteer,
# borrowed at runtime from ~/dev/apps/puck-studio/node_modules — never a
# dependency of this repo) to capture one PNG per route x theme x width,
# and kills every listener it started on exit. NEVER the live site, NEVER
# the vault — every secret here is minted fresh for this run and dies with
# it.
#
# Lessons carried in from three archived lanes this replaces:
#   task-277/shots — fixture KV shape + the theme-toggle recipe
#   task-280/shots — the real member-cookie mint, the PopupHost dismiss
#     timing, the two-browser-context fix (a signed-in shot can never leak
#     into a signed-out shot in the same run)
#   task-276/shots — the real operator-cookie mint for the /a console
#     routes, and the TENANT-override second server for /u/*
#
# PORT RULE (the reason this script exists): ports come ONLY from --ports.
# There is no default, no fallback, no port anywhere in shots-fixture.cjs
# or fixture-kv.cjs — every listener this harness starts is told its port
# by this script, which was told its ports by whoever called it. Missing
# --ports is a hard refusal (exit 2), never a guess.
#
# USAGE
#   scripts/shots-fixture.sh --ports A-B --out <dir> --routes <file|list>
#       [--themes dark,dawn] [--widths 1440,390]
#       [--cookie member|operator|none] [--tenant <name>]
#       [--click "<selector>"] [--no-build]
#       [--seed-puck <slug>[,<slug>|<slug>:<json-file>…]]
#       [--seed-store <json-file>] [--full-page]
#
#   --ports A-B     REQUIRED. Four consecutive ports, e.g. 4298-4301:
#                     A     = the app server (`next start`)
#                     A+1   = the fixture KV
#                     A+2   = the TENANT-override second server — only
#                             bound when --tenant is given AND the route
#                             list has at least one /u/* route
#                     A+3   = held in reserve, verified free before AND
#                             after the run (belt-and-suspenders against
#                             the T-232 class of collision)
#   --out DIR       REQUIRED. Where the PNGs (and the two server logs) land.
#   --routes L      REQUIRED. A comma-separated route list ("/,/about") or
#                   a path to a file with one route per line (# comments
#                   and blank lines skipped).
#   --themes L      default "dark,dawn"
#   --widths L      default "1440,390" (390 gets the phone-height frame,
#                   every other width gets the desktop frame)
#   --cookie MODE   member | operator | none (default none). EVERY mode
#                   also mints a throwaway operator npub and sets
#                   OPERATOR_NPUBS on the fixture server (T-301's seam:
#                   --cookie none used to leave OPERATOR_NPUBS unset, so
#                   OperatorGate always rendered "NO OPERATOR KEYS
#                   CONFIGURED" instead of its real signed-out Verify
#                   button — src/components/OperatorGate.tsx's `configured`
#                   prop, from operatorsConfigured() in
#                   src/lib/operator-auth.ts, reads only that env).
#   --tenant NAME   optional TENANT override, engaged only for /u/* routes
#   --click SEL     optional: one extra shot per route x theme x width,
#                   after clicking SEL, suffixed "-click"
#   --no-build      skip `next build` even if .next looks stale
#   --seed-puck L   TASK-294: comma-separated list of `<slug>` or
#                   `<slug>:<json-file>` — seeds the fixture KV's
#                   `puck:page:<slug>` key (src/lib/puck-store.ts's
#                   liveKey, packages/page-store/src/store.ts:24) so
#                   getPuckPage(slug) (store.ts:101-103) returns it. A bare
#                   `<slug>` dumps SEEDS[slug] from src/lib/puck-seeds.ts;
#                   `<slug>:<json-file>` seeds a hand-made doc instead.
#                   Folded from two T-295 pickup-feedback variants (see
#                   "Folded in" below).
#   --seed-store F  TASK-294 (generalized from T-291's `--seed`): seeds
#                   the fixture KV's `store:catalog` key (src/lib/store.ts:261
#                   CATALOG_KV) from a JSON file, so the /a/store
#                   deliverables panel and catalog pages have wares to shoot.
#   --seed-kv F     TASK-326: seeds ARBITRARY keys — F is a JSON array of
#                   command arrays, each already in fixture-kv.cjs's wire
#                   shape (["SET",k,v] / ["SADD",k,m]); a record value is
#                   the stringified JSON document, the same shape
#                   --seed-store builds below. Repeatable. This is how a
#                   lane seeds bookings (booking:index + booking:rec:<id>)
#                   or orders (store:orders:index + store:order:<id>) —
#                   --seed-store only ever SETs store:catalog.
#   --full-page     TASK-294: `fullPage: true` on every screenshot; filenames
#                   gain a "-full" suffix. Default stays viewport-only.
#
# Folded in for TASK-294 (pickup-feedback R3 ask 2 — two T-295 pair
# sub-agents wrote the same shim into their outboxes this run rather than
# landing it once): `~/dev/kimi/outbox/task-295/privacy-terms/shots-fixture-seeded.sh`
# (the `<slug>:<json-file>` shape, POSTing SET puck:page:<slug> right after
# the fixture KV's health check) and
# `~/dev/kimi/outbox/task-295/welcome-meditation/{dump-seed.mjs,shots-fixture-puck-seeded.sh}`
# (same idea, plus the SEEDS[slug]-dump attempt). Both hand-rolled a plain
# node resolve hook to import src/lib/puck-seeds.ts; welcome-meditation's
# own SUMMARY.md already records why that fails: the seeds module pulls in
# a .tsx block file (src/lib/puck-blocks/retreats-list.tsx) and node's
# native TS/JSX type-stripping does not support .tsx
# (ERR_UNKNOWN_FILE_EXTENSION — reproduced verbatim while building this
# lane). Their workaround, carried in here: since vitest's own esbuild
# transform already handles .tsx (it's how `npx vitest run` exercises this
# very codebase), the dump runs as one throwaway vitest test file, written
# to tests/ (matching vitest.config.ts's `include: ["tests/**/*.test.ts"]`)
# immediately before the run and deleted immediately after — it never
# survives long enough to be `git add`ed. T-291's archived `--seed` copy
# (`~/dev/home/archive/task-291/patches/task-291/shots-fixture-seeded.sh`)
# is the source for `--seed-store`, generalized from its one hardcoded flag.
#
# This lane's own proof run:
#   scripts/shots-fixture.sh --ports 4298-4301 \
#     --out ~/dev/home/outbox/task-282/shots --routes "/,/about" --cookie none
#   scripts/shots-fixture.sh --ports 4298-4301 \
#     --out ~/dev/home/outbox/task-282/shots --routes "/a,/a/connections" --cookie operator
# ============================================================================
set -u
set -o pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SELF_DIR/.." && pwd)"
cd "$REPO_ROOT"

usage() {
  cat >&2 <<'USAGE'
usage: scripts/shots-fixture.sh --ports A-B --out <dir> --routes <file|list> [--themes dark,dawn] [--widths 1440,390] [--cookie member|operator|none] [--tenant <name>] [--click "<selector>"] [--no-build] [--seed-puck <slug>[,<slug>|<slug>:<json-file>...]] [--seed-store <json-file>] [--seed-kv <cmds-json-file>] [--full-page]
USAGE
}

PORTS=""
OUT=""
ROUTES_ARG=""
THEMES="dark,dawn"
WIDTHS="1440,390"
COOKIE_MODE="none"
TENANT_NAME=""
CLICK_SEL=""
NO_BUILD=0
SEED_PUCK=""
SEED_STORE=""
SEED_KV=()
FULL_PAGE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --ports) PORTS="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --routes) ROUTES_ARG="${2:-}"; shift 2 ;;
    --themes) THEMES="${2:-}"; shift 2 ;;
    --widths) WIDTHS="${2:-}"; shift 2 ;;
    --cookie) COOKIE_MODE="${2:-}"; shift 2 ;;
    --tenant) TENANT_NAME="${2:-}"; shift 2 ;;
    --click) CLICK_SEL="${2:-}"; shift 2 ;;
    --no-build) NO_BUILD=1; shift ;;
    --seed-puck) SEED_PUCK="${2:-}"; shift 2 ;;
    --seed-store) SEED_STORE="${2:-}"; shift 2 ;;
    --seed-kv) SEED_KV+=("${2:-}"); shift 2 ;;
    --full-page) FULL_PAGE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "shots-fixture.sh: unrecognized argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [ -z "$PORTS" ]; then
  echo "shots-fixture.sh: --ports is required" >&2
  usage
  exit 2
fi
if [ -z "$OUT" ] || [ -z "$ROUTES_ARG" ]; then
  echo "shots-fixture.sh: --out and --routes are required" >&2
  usage
  exit 2
fi
case "$COOKIE_MODE" in
  member|operator|none) ;;
  *) echo "shots-fixture.sh: --cookie must be member, operator, or none" >&2; usage; exit 2 ;;
esac

PORT_A="${PORTS%-*}"
PORT_B="${PORTS#*-}"
case "$PORT_A" in ''|*[!0-9]*) echo "shots-fixture.sh: --ports must look like A-B (e.g. 4298-4301)" >&2; usage; exit 2 ;; esac
case "$PORT_B" in ''|*[!0-9]*) echo "shots-fixture.sh: --ports must look like A-B (e.g. 4298-4301)" >&2; usage; exit 2 ;; esac
if [ $((PORT_B - PORT_A)) -ne 3 ]; then
  echo "shots-fixture.sh: --ports must span exactly four ports (A to A+3), got $PORTS" >&2
  usage
  exit 2
fi
APP_PORT=$PORT_A
KV_PORT=$((PORT_A + 1))
TENANT_PORT=$((PORT_A + 2))
SPARE_PORT=$((PORT_A + 3))

# routes: a file (one per line, # comments/blank lines skipped) or a CSV list
ROUTES_LIST=()
if [ -f "$ROUTES_ARG" ]; then
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue ;; esac
    ROUTES_LIST+=("$line")
  done < "$ROUTES_ARG"
else
  IFS=',' read -ra ROUTES_LIST <<< "$ROUTES_ARG"
fi
if [ "${#ROUTES_LIST[@]}" -eq 0 ]; then
  echo "shots-fixture.sh: --routes resolved to zero routes" >&2
  exit 2
fi
ROUTES_CSV=$(IFS=,; echo "${ROUTES_LIST[*]}")

NEEDS_TENANT_SERVER=0
if [ -n "$TENANT_NAME" ]; then
  for r in "${ROUTES_LIST[@]}"; do
    case "$r" in /u/*) NEEDS_TENANT_SERVER=1 ;; esac
  done
fi

port_free() {
  ! ss -tln 2>/dev/null | awk '{print $4}' | grep -q ":$1\$"
}

for p in $APP_PORT $KV_PORT $TENANT_PORT $SPARE_PORT; do
  if ! port_free "$p"; then
    echo "shots-fixture.sh: port $p is already bound — refusing to start (the T-232 collision this harness exists to end)" >&2
    exit 3
  fi
done

mkdir -p "$OUT"

# ---- throwaway fixture secrets, never the vault ---------------------------
SEAT_SECRET="fixture-seat-$(date +%s)-$$"
KV_TOKEN="fixture-kv-token-$$"

KV_PID=""
APP_PID=""
TENANT_PID=""
# TASK-294: the --seed-puck SEEDS[slug] dump rides ONE throwaway vitest test
# file at this fixed path — cleanup() below removes it unconditionally
# (rm -f is a no-op if --seed-puck was never used, or if it was already
# deleted after the dump ran) so a mid-run crash never leaves it behind for
# a later `git add` to pick up.
DUMP_TEST_PATH="$REPO_ROOT/tests/oc-shots-dump-puck-seed.tmp.test.ts"

cleanup() {
  RC=$?
  rm -f "$DUMP_TEST_PATH"
  for pid in "$TENANT_PID" "$APP_PID" "$KV_PID"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
  done
  for p in $APP_PORT $KV_PORT $TENANT_PORT; do
    lp=$(ss -tlnp 2>/dev/null | grep ":$p " | grep -oP 'pid=\K[0-9]+' | head -1)
    [ -n "${lp:-}" ] && kill "$lp" 2>/dev/null
  done
  wait 2>/dev/null
  sleep 1
  ALL_FREE=1
  for p in $APP_PORT $KV_PORT $TENANT_PORT $SPARE_PORT; do
    if ! port_free "$p"; then
      ALL_FREE=0
      echo "shots-fixture.sh: WARNING port $p still bound after cleanup" >&2
    fi
  done
  if [ "$ALL_FREE" -eq 1 ]; then
    echo "shots-fixture.sh: all four ports ($APP_PORT-$SPARE_PORT) verified free after cleanup"
  fi
  exit $RC
}
trap cleanup EXIT INT TERM

# ---- fixture KV -------------------------------------------------------
FIXTURE_KV_PORT=$KV_PORT node "$SELF_DIR/fixture-kv.cjs" &
KV_PID=$!
for i in $(seq 1 30); do
  curl -s -o /dev/null "http://127.0.0.1:$KV_PORT/" && break
  sleep 1
done

# ---- TASK-294: seed puck:page:<slug> keys into the fixture KV -------------
# See the header docblock ("Folded in for TASK-294") for the two adaptations
# unified here and why the dump runs through vitest, not plain node.
if [ -n "$SEED_PUCK" ]; then
  IFS=',' read -ra SEED_PUCK_ITEMS <<< "$SEED_PUCK"
  DUMP_SLUGS=()
  for item in "${SEED_PUCK_ITEMS[@]}"; do
    case "$item" in
      *:*) : ;; # <slug>:<json-file> — hand-made doc, no dump needed
      *) DUMP_SLUGS+=("$item") ;;
    esac
  done
  if [ "${#DUMP_SLUGS[@]}" -gt 0 ]; then
    DUMP_SLUGS_JSON=$(node -e 'process.stdout.write(JSON.stringify(process.argv.slice(1)))' "${DUMP_SLUGS[@]}")
    cat > "$DUMP_TEST_PATH" <<'DUMPEOF'
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { SEEDS } from "@/lib/puck-seeds";

/* TASK-294: throwaway — written by shots-fixture.sh immediately before this
   run and deleted immediately after (see DUMP_TEST_PATH's cleanup()). Dumps
   each requested slug's SEEDS[slug] to $OC_SHOTS_DUMP_DIR/.puck-seed-<slug>.json
   for shots-fixture.sh to SET into the fixture KV's puck:page:<slug>. */
it("TASK-294 dump requested puck seeds for the shots fixture KV", () => {
  const slugs = JSON.parse(process.env.OC_SHOTS_DUMP_SLUGS ?? "[]") as string[];
  const outDir = process.env.OC_SHOTS_DUMP_DIR ?? "";
  for (const slug of slugs) {
    const doc = (SEEDS as Record<string, unknown>)[slug];
    if (!doc) {
      throw new Error(`shots-fixture.sh --seed-puck: no SEEDS["${slug}"] in src/lib/puck-seeds.ts`);
    }
    writeFileSync(`${outDir}/.puck-seed-${slug}.json`, JSON.stringify(doc));
  }
});
DUMPEOF
    DUMP_RC=0
    OC_SHOTS_DUMP_SLUGS="$DUMP_SLUGS_JSON" OC_SHOTS_DUMP_DIR="$OUT" \
      npx vitest run "tests/oc-shots-dump-puck-seed.tmp.test.ts" > "$OUT/dump-puck-seed.log" 2>&1 || DUMP_RC=$?
    rm -f "$DUMP_TEST_PATH"
    if [ "$DUMP_RC" -ne 0 ]; then
      echo "shots-fixture.sh: --seed-puck dump failed — see $OUT/dump-puck-seed.log" >&2
      exit 1
    fi
  fi

  for item in "${SEED_PUCK_ITEMS[@]}"; do
    case "$item" in
      *:*) slug="${item%%:*}"; seed_file="${item#*:}" ;;
      *) slug="$item"; seed_file="$OUT/.puck-seed-$item.json" ;;
    esac
    if [ -z "$slug" ] || [ ! -f "$seed_file" ]; then
      echo "shots-fixture.sh: --seed-puck needs <slug> or <slug>:<existing json-file>, got: $item" >&2
      exit 2
    fi
    SEED_CMD=$(node -e '
      const fs = require("fs");
      const doc = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      process.stdout.write(JSON.stringify(["SET", "puck:page:" + process.argv[2], JSON.stringify(doc)]));
    ' "$seed_file" "$slug")
    SEED_RES=$(curl -s -X POST -d "$SEED_CMD" "http://127.0.0.1:$KV_PORT/")
    case "$SEED_RES" in
      *'"result":"OK"'*) echo "shots-fixture.sh: seeded puck:page:$slug from $seed_file" ;;
      *) echo "shots-fixture.sh: puck seed for $slug did not answer OK: $SEED_RES" >&2; exit 1 ;;
    esac
  done
fi

# ---- TASK-294: seed store:catalog into the fixture KV ---------------------
# Generalized from T-291's archived --seed shim
# (~/dev/home/archive/task-291/patches/task-291/shots-fixture-seeded.sh),
# same wire shape, new flag name (--seed-puck now owns the bare --seed word).
if [ -n "$SEED_STORE" ]; then
  if [ ! -f "$SEED_STORE" ]; then
    echo "shots-fixture.sh: --seed-store file not found: $SEED_STORE" >&2
    exit 2
  fi
  SEED_CMD=$(node -e '
    const fs = require("fs");
    const catalog = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(JSON.stringify(["SET", "store:catalog", JSON.stringify(catalog)]));
  ' "$SEED_STORE")
  SEED_RES=$(curl -s -X POST -d "$SEED_CMD" "http://127.0.0.1:$KV_PORT/")
  case "$SEED_RES" in
    *'"result":"OK"'*) echo "shots-fixture.sh: seeded store:catalog from $SEED_STORE" ;;
    *) echo "shots-fixture.sh: store:catalog seed did not answer OK: $SEED_RES" >&2; exit 1 ;;
  esac
fi

# ---- TASK-326: seed arbitrary keys (--seed-kv) ----------------------------
# Bookings (booking:index + booking:rec:<id>) and orders (store:orders:index
# + store:order:<id>) are sets + stringified records — --seed-store's one
# SET can't build them. The file is a JSON array of command arrays, each
# already fixture-kv.cjs's POST body; one POST per command, every command
# must answer a non-null result (null = the KV didn't take it).
if [ "${#SEED_KV[@]}" -gt 0 ]; then
  for seed_file in "${SEED_KV[@]}"; do
    if [ ! -f "$seed_file" ]; then
      echo "shots-fixture.sh: --seed-kv file not found: $seed_file" >&2
      exit 2
    fi
    SEED_CMDS=$(node -e '
      const fs = require("fs");
      const cmds = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      if (!Array.isArray(cmds) || !cmds.every((c) => Array.isArray(c))) {
        console.error("shots-fixture.sh: --seed-kv file must be a JSON array of command arrays");
        process.exit(2);
      }
      for (const c of cmds) console.log(JSON.stringify(c));
    ' "$seed_file") || exit 2
    while IFS= read -r SEED_CMD; do
      [ -z "$SEED_CMD" ] && continue
      SEED_RES=$(curl -s -X POST -d "$SEED_CMD" "http://127.0.0.1:$KV_PORT/")
      case "$SEED_RES" in
        *'"result":null'*|*"error"*)
          echo "shots-fixture.sh: --seed-kv command did not land: $SEED_CMD -> $SEED_RES" >&2; exit 1 ;;
        *'"result"'*) : ;;
        *)
          echo "shots-fixture.sh: --seed-kv got no result envelope: $SEED_CMD -> $SEED_RES" >&2; exit 1 ;;
      esac
    done <<< "$SEED_CMDS"
    echo "shots-fixture.sh: seeded $seed_file into the fixture KV"
  done
fi

# ---- build once if .next looks stale -----------------------------------
if [ "$NO_BUILD" -eq 0 ] && [ ! -f "$REPO_ROOT/.next/BUILD_ID" ]; then
  echo "shots-fixture.sh: .next missing — building once (npx next build)"
  npx next build || exit 1
fi

# ---- mint the requested cookie with the REAL auth functions ------------
# Extensionless relative TS imports (member-auth.ts -> ./registry, etc.)
# are the codebase's own convention — Next.js resolves them fine. A bare
# `node` runner needs the same resolve hook scripts/calendar-view.test.mjs
# already teaches it, so this mint step borrows that exact recipe rather
# than hand-duplicating any HMAC shape (the task-280 archive hand-rolled
# the member cookie and only proved it identical by a side-by-side smoke
# test; calling the real function removes that whole class of drift).
#
# TASK-294 Build 4 (T-301's seam): this step now runs in EVERY cookie mode,
# not just member/operator — it always mints a throwaway operator npub and
# reports it as operatorNpub, so OPERATOR_NPUBS gets set on the fixture
# server below no matter what --cookie is. Without this, OperatorGate
# (src/components/OperatorGate.tsx) always rendered its `configured=false`
# branch ("NO OPERATOR KEYS CONFIGURED") on --cookie none/member runs,
# instead of the real signed-out door (the Verify button) a visitor with no
# operator cookie actually sees on a properly configured deployment.
COOKIE_NAME=""
COOKIE_VALUE=""
OPERATOR_NPUB=""
MINT_JS='
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
const mode = process.env.OC_SHOTS_COOKIE_MODE;
const tenant = process.env.OC_SHOTS_TENANT || "onecocreation";

// TASK-294: always mint a throwaway operator npub, every mode — it only
// ever feeds OPERATOR_NPUBS (an env allowlist check, packages/operator-auth
// verifyOperatorToken never checks it), never a browser cookie unless
// --cookie operator also reuses this exact keypair below.
const { generateSecretKey, getPublicKey, nip19 } = await import("nostr-tools");
const envSk = generateSecretKey();
const envPubkeyHex = getPublicKey(envSk);
const envNpub = nip19.npubEncode(envPubkeyHex);
const out = { operatorNpub: envNpub };

if (mode === "member") {
  const { makeMemberToken, MEMBER_COOKIE } = await import(path.join(REPO, "src", "lib", "member-auth.ts"));
  out.cookieName = MEMBER_COOKIE;
  out.cookieValue = makeMemberToken("fixturemember", tenant);
} else if (mode === "operator") {
  // reuse the SAME keypair for the browser cookie so the consoles signed-in
  // identity matches the allowlisted env, not two unrelated throwaway keys
  const { makeOperatorToken, OPERATOR_COOKIE } = await import(path.join(REPO, "src", "lib", "operator-auth.ts"));
  out.cookieName = OPERATOR_COOKIE;
  out.cookieValue = makeOperatorToken(envPubkeyHex);
}
process.stdout.write(JSON.stringify(out));
'
MINT_OUT=$(SEAT_SECRET="$SEAT_SECRET" OC_SHOTS_COOKIE_MODE="$COOKIE_MODE" OC_SHOTS_TENANT="$TENANT_NAME" \
  node --input-type=module -e "$MINT_JS" 2>"$OUT/mint-cookie.log")
MINT_RC=$?
if [ "$MINT_RC" -ne 0 ] || [ -z "$MINT_OUT" ]; then
  echo "shots-fixture.sh: cookie/operator-npub mint failed (mode=$COOKIE_MODE) — see $OUT/mint-cookie.log" >&2
  exit 1
fi
COOKIE_NAME=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).cookieName||"")' "$MINT_OUT")
COOKIE_VALUE=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).cookieValue||"")' "$MINT_OUT")
OPERATOR_NPUB=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).operatorNpub||"")' "$MINT_OUT")

# ---- start the app server(s), throwaway env only, never the vault -------
COMMON_ENV=(NODE_ENV=production \
  SEAT_SECRET="$SEAT_SECRET" \
  KV_REST_API_URL="http://127.0.0.1:$KV_PORT" KV_REST_API_TOKEN="$KV_TOKEN" \
  BTCPAY_URL=http://btcpay.fixture BTCPAY_STORE_ID=fixture-store BTCPAY_API_KEY=fixture-key \
  SQUARE_ACCESS_TOKEN=fixture-square-token SQUARE_LOCATION_ID=fixture-location \
  OPERATOR_NPUBS="$OPERATOR_NPUB")

env -i PATH="$PATH" HOME="$HOME" "${COMMON_ENV[@]}" \
  npx next start -p "$APP_PORT" -H 127.0.0.1 > "$OUT/serve-app.log" 2>&1 &
APP_PID=$!

if [ "$NEEDS_TENANT_SERVER" -eq 1 ]; then
  env -i PATH="$PATH" HOME="$HOME" "${COMMON_ENV[@]}" TENANT="$TENANT_NAME" \
    npx next start -p "$TENANT_PORT" -H 127.0.0.1 > "$OUT/serve-tenant.log" 2>&1 &
  TENANT_PID=$!
fi

for i in $(seq 1 60); do
  curl -s -o /dev/null "http://127.0.0.1:$APP_PORT/" && break
  sleep 1
done
if [ "$NEEDS_TENANT_SERVER" -eq 1 ]; then
  for i in $(seq 1 60); do
    curl -s -o /dev/null "http://127.0.0.1:$TENANT_PORT/" && break
    sleep 1
  done
fi
sleep 2

# ---- drive the shots ------------------------------------------------------
DRIVER_ARGS=(--base "http://127.0.0.1:$APP_PORT" --out "$OUT" --routes "$ROUTES_CSV" --themes "$THEMES" --widths "$WIDTHS")
if [ "$NEEDS_TENANT_SERVER" -eq 1 ]; then
  DRIVER_ARGS+=(--tenant-base "http://127.0.0.1:$TENANT_PORT")
fi
if [ -n "$COOKIE_NAME" ]; then
  DRIVER_ARGS+=(--cookie-name "$COOKIE_NAME" --cookie-value "$COOKIE_VALUE")
fi
if [ -n "$CLICK_SEL" ]; then
  DRIVER_ARGS+=(--click "$CLICK_SEL")
fi
if [ "$FULL_PAGE" -eq 1 ]; then
  DRIVER_ARGS+=(--full-page 1)
fi

node "$SELF_DIR/shots-fixture.cjs" "${DRIVER_ARGS[@]}"
RC=$?

echo "shots-fixture.sh: driver exited $RC (app pid $APP_PID, kv pid $KV_PID, tenant pid ${TENANT_PID:-none})"
exit $RC
