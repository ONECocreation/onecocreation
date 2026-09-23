#!/bin/bash
# ============================================================================
# scripts/console-matrix.sh — TASK-418 (GUARD · chrome matrix ★), the
# two-build orchestrator for the /a chrome-matrix walker. "Both chromes" =
# TWO BUILDS of the same tree (src/lib/console.ts:32-33 reads
# NEXT_PUBLIC_CONSOLE_CHROME at BUILD time): build (site) → serve → walk →
# kill → build (default scar) → serve → walk → kill — site FIRST, scar LAST
# (R12), so the tree is left on the default build as a dev would find it.
# The walking itself — fixture KV, throwaway SEAT_SECRET, the real
# operator mint, the production `next start` on the given ports — lives in
# scripts/console-matrix.cjs (the walker); this script owns the builds, the
# port law, the selftest, the network isolation (R5), and the merged report.
#
# It is the shots-fixture.sh sibling (mirror, never edit): ports come ONLY
# from --ports A-B, exactly four consecutive ports — A = the app server,
# A+1 = the fixture KV, A+2 = reserve (the --selftest scratch server binds
# it), A+3 = reserve. All four verified free BEFORE and AFTER the run;
# every listener on them is trap-killed on exit (the walker kills its own —
# this trap is the belt-and-suspenders backstop, the T-232 lesson). Missing
# --ports is a hard refusal (exit 2), never a guess.
#
# NOT gate-riding (K106): this runs on Number One's word like
# shots-fixture.sh; the repo's five gate steps stay exactly as they are.
#
# USAGE
#   scripts/console-matrix.sh --ports A-B --out <dir>
#       the full proof run: selftest → scar build → scar walk → site build
#       → site walk → merged matrix-report.json + one-screen summary.
#   scripts/console-matrix.sh --ports A-B --out <dir> --no-build --chrome scar|site
#       the fast path for repeats: skips BOTH builds and walks only the
#       chrome the CURRENT .next was built as — --chrome declares which,
#       honestly (there is no way to ask a build what it is; a wrong
#       declaration fails the walk by name, never passes silently). The
#       merged report then carries ONE build, labelled.
#
# Outputs in --out: matrix-report-scar.json / matrix-report-site.json (the
# walker's per-build reports), matrix-report.json (the merged both-builds
# report — the hand-back artifact), walk-*.summary.txt, selftest.txt, and
# the server/KV/mint logs.
# ============================================================================
set -u
set -o pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SELF_DIR/.." && pwd)"
cd "$REPO_ROOT"

usage() {
  cat >&2 <<'USAGE'
usage: scripts/console-matrix.sh --ports A-B --out <dir> [--no-build --chrome scar|site]
       run from a lane worktree — a checkout carrying env files is refused
USAGE
}

PORTS=""
OUT=""
NO_BUILD=0
CHROME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --ports) PORTS="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --no-build) NO_BUILD=1; shift ;;
    --chrome) CHROME="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "console-matrix.sh: unrecognized argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [ -z "$PORTS" ] || [ -z "$OUT" ]; then
  echo "console-matrix.sh: --ports and --out are required" >&2
  usage
  exit 2
fi

# R10: env files at the repo root mean this is not a lane worktree — a name
# test only, they are never read.
for f in .env .env.local .env.production .env.production.local; do
  if [ -f "$REPO_ROOT/$f" ]; then
    echo "console-matrix.sh: $f exists at the repo root — run from a lane worktree, never a checkout carrying env files" >&2
    exit 2
  fi
done
PORT_A="${PORTS%-*}"
PORT_B="${PORTS#*-}"
case "$PORT_A" in ''|*[!0-9]*) echo "console-matrix.sh: --ports must look like A-B (e.g. 4750-4753)" >&2; usage; exit 2 ;; esac
case "$PORT_B" in ''|*[!0-9]*) echo "console-matrix.sh: --ports must look like A-B (e.g. 4750-4753)" >&2; usage; exit 2 ;; esac
if [ $((PORT_B - PORT_A)) -ne 3 ]; then
  echo "console-matrix.sh: --ports must span exactly four ports (A to A+3), got $PORTS" >&2
  usage
  exit 2
fi
APP_PORT=$PORT_A
KV_PORT=$((PORT_A + 1))
SCRATCH_PORT=$((PORT_A + 2))
SPARE_PORT=$((PORT_A + 3))

if [ "$NO_BUILD" -eq 1 ]; then
  case "$CHROME" in
    scar|site) ;;
    *) echo "console-matrix.sh: --no-build needs --chrome scar|site — the current .next is ONE chrome's build; declare which, honestly" >&2; usage; exit 2 ;;
  esac
  if [ ! -f "$REPO_ROOT/.next/BUILD_ID" ]; then
    echo "console-matrix.sh: --no-build but .next/BUILD_ID is missing — there is no build to reuse" >&2
    exit 2
  fi
  # R9: the build stamp must name THIS head and the DECLARED chrome, and
  # src/ must be clean — else the .next cannot be proven to be this tree's
  # build and the fast path refuses.
  STAMP="$REPO_ROOT/.next/.console-matrix-build.json"
  if [ ! -f "$STAMP" ]; then
    echo "console-matrix.sh: --no-build but .next/.console-matrix-build.json is missing — the current build's provenance is unknown; run a full build" >&2
    exit 2
  fi
  STAMP_HEAD="$(sed -n 's/.*"head":"\([^"]*\)".*/\1/p' "$STAMP")"
  STAMP_CHROME="$(sed -n 's/.*"chrome":"\([^"]*\)".*/\1/p' "$STAMP")"
  if [ "$STAMP_HEAD" != "$(git rev-parse HEAD)" ]; then
    echo "console-matrix.sh: --no-build but the build stamp names $STAMP_HEAD, not HEAD ($(git rev-parse HEAD)) — the .next is stale; run a full build" >&2
    exit 2
  fi
  if [ "$STAMP_CHROME" != "$CHROME" ]; then
    echo "console-matrix.sh: --no-build --chrome $CHROME but the build stamp names chrome=$STAMP_CHROME — a wrong declaration fails here, never silently" >&2
    exit 2
  fi
  if [ -n "$(git status --porcelain -- src)" ]; then
    echo "console-matrix.sh: --no-build but src/ carries uncommitted changes — the .next cannot be this tree's build; run a full build" >&2
    exit 2
  fi
fi

port_free() {
  ! ss -tln 2>/dev/null | awk '{print $4}' | grep -q ":$1\$"
}

for p in $APP_PORT $KV_PORT $SCRATCH_PORT $SPARE_PORT; do
  if ! port_free "$p"; then
    echo "console-matrix.sh: port $p is already bound — refusing to start (the T-232 collision the port law exists to end)" >&2
    exit 3
  fi
done

mkdir -p "$OUT"

# ---- R5: no request leaves the box ----------------------------------------
# The block height is read OUTSIDE the network namespace and handed in —
# under unshare the beacon is unreachable by design (the walker prefers
# OC_MATRIX_BLOCK_HEIGHT, else fetches itself).
BLOCK_HEIGHT="$(curl -fsS --max-time 5 https://time.pacsarcade.org/height 2>/dev/null | sed -n 's/.*"height":\([0-9]*\).*/\1/p')"
if [ -n "$BLOCK_HEIGHT" ]; then
  export OC_MATRIX_BLOCK_HEIGHT="$BLOCK_HEIGHT"
  echo "console-matrix.sh: block $BLOCK_HEIGHT (read outside the namespace)"
fi

# R9: the run stamp — every report this run must be NEWER than it and name
# THIS head; the merge refuses anything else (a stale report from an older
# run or tree can never ride into the hand-back).
RUN_HEAD="$(git rev-parse HEAD)"
printf 'head=%s\nblock=%s\n' "$RUN_HEAD" "${BLOCK_HEIGHT:-}" > "$OUT/.run-start"

# Preferred isolation is a network namespace: unshare --user --map-root-user
# --net with loopback raised — every walker invocation (selftest and both
# walks, with their KV/app/stub/chromium children) runs inside ONE namespace
# where loopback is the whole world. When the kernel refuses it the walker
# still runs behind browser request interception and loopback-pinned server
# env, and the residue is printed, honestly.
ISOLATION="interception+loopback-env"
if unshare --user --map-root-user --net bash -c 'ip link set lo up' 2>/dev/null; then
  ISOLATION="unshare-net"
fi
export OC_MATRIX_ISOLATION="$ISOLATION"
if [ "$ISOLATION" = "unshare-net" ]; then
  echo "console-matrix.sh: isolation: unshare-net (a network namespace — loopback is the whole world)"
  run_walker() { unshare --user --map-root-user --net bash -c 'ip link set lo up 2>/dev/null; exec node "$@"' _ "$WALKER" "$@"; }
else
  echo "console-matrix.sh: WARNING the kernel refused unshare --net — isolation: interception+loopback-env;" >&2
  echo "console-matrix.sh:   browser requests off the box are aborted (a FINDING each), but server-side code" >&2
  echo "console-matrix.sh:   can still reach out past the env pins (the residue, named)" >&2
  run_walker() { node "$WALKER" "$@"; }
fi

cleanup() {
  RC=$?
  for p in $APP_PORT $KV_PORT $SCRATCH_PORT; do
    lp=$(ss -tlnp 2>/dev/null | grep ":$p " | grep -oP 'pid=\K[0-9]+' | head -1)
    [ -n "${lp:-}" ] && kill "$lp" 2>/dev/null
  done
  sleep 1
  ALL_FREE=1
  for p in $APP_PORT $KV_PORT $SCRATCH_PORT $SPARE_PORT; do
    if ! port_free "$p"; then
      ALL_FREE=0
      echo "console-matrix.sh: WARNING port $p still bound after cleanup" >&2
    fi
  done
  if [ "$ALL_FREE" -eq 1 ]; then
    echo "console-matrix.sh: all four ports ($APP_PORT-$SPARE_PORT) verified free after cleanup"
  fi
  exit $RC
}
trap cleanup EXIT INT TERM

WALKER="$SELF_DIR/console-matrix.cjs"
FINAL_RC=0

# ---- the walker's own red-then-green, once per run ----------------------
echo "console-matrix.sh: selftest (the walker against a deliberately wrong scratch server)"
if ! run_walker --selftest --ports "$PORTS" --out "$OUT"; then
  echo "console-matrix.sh: SELFTEST FAILED — the walker itself is suspect; refusing to trust a run" >&2
  exit 1
fi

walk_chrome() {
  local chrome="$1"
  echo "console-matrix.sh: walking chrome=$chrome"
  if ! run_walker --chrome "$chrome" --ports "$PORTS" --out "$OUT"; then
    echo "console-matrix.sh: the $chrome walk went RED" >&2
    FINAL_RC=1
  fi
}

if [ "$NO_BUILD" -eq 1 ]; then
  echo "console-matrix.sh: --no-build — reusing the current .next as the $CHROME build (declared, honestly)"
  walk_chrome "$CHROME"
else
  # R12: site FIRST, scar LAST — the tree is left on the default build, as
  # a dev would find it. Each build stamps its provenance for --no-build.
  # ---- build 1: the site chrome -------------------------------------------
  echo "console-matrix.sh: building the site chrome (NEXT_PUBLIC_CONSOLE_CHROME=site)"
  NEXT_PUBLIC_CONSOLE_CHROME=site npx next build || exit 1
  printf '{"head":"%s","chrome":"site"}\n' "$(git rev-parse HEAD)" > "$REPO_ROOT/.next/.console-matrix-build.json"
  walk_chrome "site"

  # ---- build 2: the default (scar) chrome — LAST ----------------------------
  echo "console-matrix.sh: building the default (scar) chrome"
  env -u NEXT_PUBLIC_CONSOLE_CHROME npx next build || exit 1
  printf '{"head":"%s","chrome":"scar"}\n' "$(git rev-parse HEAD)" > "$REPO_ROOT/.next/.console-matrix-build.json"
  walk_chrome "scar"
fi

# ---- merge the per-build reports into the hand-back artifact -------------
MERGE_CHROMES="$CHROME"
if [ "$NO_BUILD" -eq 0 ]; then
  MERGE_CHROMES="site scar"
fi
node - "$OUT" $MERGE_CHROMES <<'MERGEEOF'
const fs = require("fs");
const path = require("path");
const [out, ...chromes] = process.argv.slice(2);
/* R9: every report must be NEWER than the run stamp and name its head */
let runHead = null;
let stampMtime = 0;
const stampPath = path.join(out, ".run-start");
if (fs.existsSync(stampPath)) {
  const stamp = fs.readFileSync(stampPath, "utf8");
  runHead = (stamp.match(/^head=(.*)$/m) || [])[1] || null;
  stampMtime = fs.statSync(stampPath).mtimeMs;
}
const builds = [];
let missing = 0;
for (const chrome of chromes) {
  const p = path.join(out, `matrix-report-${chrome}.json`);
  if (!fs.existsSync(p)) {
    console.error(`console-matrix.sh: missing ${p} — the ${chrome} walk never reported`);
    missing = 1;
    continue;
  }
  if (stampMtime && fs.statSync(p).mtimeMs < stampMtime) {
    console.error(`console-matrix.sh: ${p} is OLDER than the run stamp — a stale report, refused`);
    missing = 1;
    continue;
  }
  const report = JSON.parse(fs.readFileSync(p, "utf8"));
  if (runHead && report.head !== runHead) {
    console.error(`console-matrix.sh: ${p} names head ${report.head}, not this run's ${runHead} — refused`);
    missing = 1;
    continue;
  }
  builds.push(report);
}
/* R7: each build's client-navigation step counts as ONE entry in the totals */
const totals = { pass: 0, fail: 0, dash: 0 };
for (const b of builds) {
  for (const c of b.cells) totals[c.result === "pass" ? "pass" : c.result === "fail" ? "fail" : "dash"]++;
  if (b.clientNav) totals[b.clientNav.result === "pass" ? "pass" : b.clientNav.result === "fail" ? "fail" : "dash"]++;
}
const merged = {
  tool: "console-matrix (TASK-418) — the merged both-builds report",
  builds: builds.map((b) => b.chrome),
  blockHeight: builds.map((b) => b.blockHeight).find((h) => h != null) ?? null,
  head: builds[0] ? builds[0].head : null,
  isolation: builds[0] ? builds[0].isolation : null,
  totals,
  reports: builds,
};
fs.writeFileSync(path.join(out, "matrix-report.json"), JSON.stringify(merged, null, 2) + "\n");
console.log(
  `console-matrix.sh: merged ${builds.length} build report(s) [${builds.map((b) => b.chrome).join(", ")}] — ` +
    `PASS ${totals.pass} · FAIL ${totals.fail} · DASH ${totals.dash} (cells + one client-nav per build) → ${path.join(out, "matrix-report.json")}`
);
process.exit(missing);
MERGEEOF
[ $? -ne 0 ] && FINAL_RC=1

if [ "$NO_BUILD" -eq 0 ]; then
  echo "console-matrix.sh: .next now holds the default (scar) build — the tree is left as a dev would find it"
fi

echo "console-matrix.sh: done (rc=$FINAL_RC) — reports in $OUT"
exit $FINAL_RC
