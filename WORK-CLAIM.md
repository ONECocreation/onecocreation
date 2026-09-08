# WORK-CLAIM — TASK-167 (the Money desk's CARDS card — one card, Square + Stripe sections, per-row checklist)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.17 a₿ · block 966,080
BRANCH: `feat/task-167-money-cards`
WORKTREE: `~/dev/worktrees/task-167`
BASE: main tip `45d1d59` (the Square-webhook env carry deploy commit).
ROOM: The Admiral's walk of /a/money (his picture: money-square1.png): the
Cards rail becomes ONE card ("Cards", same width/frame as the Bitcoin card)
with a Square section and a Stripe section inside, each with ONE status chip
in words ("live" / "not set up" / "partly set up · N of 5"). Square: the
Test-the-connection button FIRST, then the five values as a per-row
checklist — check (set + verified), empty box (not set), red mark + the
error sentence beside it (set but failing); every row says where the value
lives in words. Webhook key/URL rows honestly read "waiting for Square's
first event…" until the webhook route records a verified event — two new KV
markers (`square:webhook:last-verified` {at, eventType} written after a good
signature; `square:webhook:last-rejected` {at, reason} after a bad one,
additive). Paste-in vault fields stay, folded under "Set it here instead"
for unset rows only. Collapsible "How to set this up" per section (exact
Square steps from the brief; Stripe: two keys + the honest "not built yet"
line). REMOVED: the "Bitcoin on this Square location" check (can never
verify) and the "Square catalog display"/Enable-display block (a Pac's
Arcade feature — separation law); SquareCatalogDesk.tsx +
src/lib/square-catalog.ts + the square-catalog api route are deleted because
NOTHING else imports them (only the dead mount did). No "Pac", no
"read-only"/"hosted checkout" jargon; "connected as OneCocreation" stays.
CONCURRENCY: lanes T-161 (a/site, about, site-config) and T-163 (store.ts,
catalog-lock) run in their own worktrees — disjoint file sets. This lane
never touches another worktree, the main checkout, or the live site.
Does NOT touch `.env.local`, the operator's live processes, any deployment.
Dev server on :3156 only, killed by recorded listener PID (`ss -tlnp`).
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push, never archive. Never `git stash` (shared across
worktrees). ENGLISH-PIN. No new dependencies. BFT dating in comments. Love
design laws: no serif faces (house tokens only), contrast ≥ 4.5:1, no
color-only meaning (the red error mark carries the error SENTENCE beside
it). Derive-or-dash — never a fake link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/components/console/CardsRailCard.tsx` (NEW — replaces both rail
  cards; pure row/chip derivations exported for tests, the T-148
  storeCardModel idiom)
- `src/components/console/SquareRailCard.tsx` (DELETED — folded in)
- `src/components/console/StripeRailCard.tsx` (DELETED — folded in)
- `src/components/console/SquareCatalogDesk.tsx` (DELETED — nothing else
  imports it once the mount drops)
- `src/lib/square-catalog.ts` (DELETED — imported only by the desk + route)
- `src/app/api/admin/store/square-catalog/route.ts` (DELETED — same)
- `src/app/a/money/page.tsx` — THE MOUNT ONLY (one CardsRailCard where the
  two rail cards sat)
- `src/app/api/admin/store/square/route.ts` — per-row verification (a
  cached locations call = the access-token/location-ID/environment verdict)
  + reads the two webhook markers; the bitcoin-enablement check DROPS
- `src/app/api/store/webhook/square/route.ts` — the two markers, additive
- `tests/money-cards.test.ts` (NEW) + `tests/money-desk.test.ts` (fixture
  rename — the stubbed location answers "OneCocreation", never "Pac")
- FORCED EDIT (OWNS exit 2, one-line justification in SUMMARY.md):
  `src/lib/payments.ts` — extract the webhook HMAC check into an exported,
  additive `squareWebhookSignatureOk()` (verifyWebhook rides it unchanged):
  without it the webhook route cannot tell "signature failed" apart from
  "verified but an event shape we don't act on" (order.updated OPEN), and
  the last-rejected marker would lie.

Brief: `~/dev/kimi/inbox/TASK-167-oc-money-desk-cards.md` (cut 0018.06.17 a₿)
Gates: `npx vitest run` (base 281 — must grow past the branch's OWN base) ·
`npm run lint` = 0/0 · `npx tsc --noEmit` · `npx next build` · ALL
`node scripts/*.test.mjs` (calendar 70, cartridge 183, square-payments 36 —
the webhook route is touched) · shots: the Cards card in three states
(all set + webhook waiting; all set + a rejected signature; nothing set with
the instructions open), both themes, 1440 + 390 — harness borrowed per the
task-148 outbox idiom (shoot.cjs + run-shots.sh, puppeteer by require-path,
NEVER a dependency) → `~/dev/kimi/outbox/task-167/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-167/`, ending LANE-DONE + full sha.
Questions → Number One.
