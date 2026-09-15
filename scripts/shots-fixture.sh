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
#   --cookie MODE   member | operator | none (default none)
#   --tenant NAME   optional TENANT override, engaged only for /u/* routes
#   --click SEL     optional: one extra shot per route x theme x width,
#                   after clicking SEL, suffixed "-click"
#   --no-build      skip `next build` even if .next looks stale
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
usage: scripts/shots-fixture.sh --ports A-B --out <dir> --routes <file|list> [--themes dark,dawn] [--widths 1440,390] [--cookie member|operator|none] [--tenant <name>] [--click "<selector>"] [--no-build]
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

cleanup() {
  RC=$?
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
COOKIE_NAME=""
COOKIE_VALUE=""
OPERATOR_NPUB=""
if [ "$COOKIE_MODE" != "none" ]; then
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
if (mode === "member") {
  const { makeMemberToken, MEMBER_COOKIE } = await import(path.join(REPO, "src", "lib", "member-auth.ts"));
  const value = makeMemberToken("fixturemember", tenant);
  process.stdout.write(JSON.stringify({ cookieName: MEMBER_COOKIE, cookieValue: value }));
} else if (mode === "operator") {
  const { generateSecretKey, getPublicKey, nip19 } = await import("nostr-tools");
  const sk = generateSecretKey();
  const pubkeyHex = getPublicKey(sk);
  const npub = nip19.npubEncode(pubkeyHex);
  const { makeOperatorToken, OPERATOR_COOKIE } = await import(path.join(REPO, "src", "lib", "operator-auth.ts"));
  const value = makeOperatorToken(pubkeyHex);
  process.stdout.write(JSON.stringify({ cookieName: OPERATOR_COOKIE, cookieValue: value, operatorNpub: npub }));
}
'
  MINT_OUT=$(SEAT_SECRET="$SEAT_SECRET" OC_SHOTS_COOKIE_MODE="$COOKIE_MODE" OC_SHOTS_TENANT="$TENANT_NAME" \
    node --input-type=module -e "$MINT_JS" 2>"$OUT/mint-cookie.log")
  MINT_RC=$?
  if [ "$MINT_RC" -ne 0 ] || [ -z "$MINT_OUT" ]; then
    echo "shots-fixture.sh: cookie mint failed (mode=$COOKIE_MODE) — see $OUT/mint-cookie.log" >&2
    exit 1
  fi
  COOKIE_NAME=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).cookieName)' "$MINT_OUT")
  COOKIE_VALUE=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).cookieValue)' "$MINT_OUT")
  OPERATOR_NPUB=$(node -e 'const o=JSON.parse(process.argv[1]); process.stdout.write(o.operatorNpub||"")' "$MINT_OUT")
fi

# ---- start the app server(s), throwaway env only, never the vault -------
COMMON_ENV=(NODE_ENV=production \
  SEAT_SECRET="$SEAT_SECRET" \
  KV_REST_API_URL="http://127.0.0.1:$KV_PORT" KV_REST_API_TOKEN="$KV_TOKEN" \
  BTCPAY_URL=http://btcpay.fixture BTCPAY_STORE_ID=fixture-store BTCPAY_API_KEY=fixture-key \
  SQUARE_ACCESS_TOKEN=fixture-square-token SQUARE_LOCATION_ID=fixture-location)
if [ -n "$OPERATOR_NPUB" ]; then
  COMMON_ENV+=(OPERATOR_NPUBS="$OPERATOR_NPUB")
fi

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

node "$SELF_DIR/shots-fixture.cjs" "${DRIVER_ARGS[@]}"
RC=$?

echo "shots-fixture.sh: driver exited $RC (app pid $APP_PID, kv pid $KV_PID, tenant pid ${TENANT_PID:-none})"
exit $RC
