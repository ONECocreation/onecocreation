# WORK-CLAIM — TASK-129 (THE SWITCHES — a site-config doc + the /a/site room so Love hides what isn't done and toggles the payment rails)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,946)
BRANCH: `feat/task-129-site-switches`
WORKTREE: `~/dev/worktrees/task-129`
BASE: main tip `7154228` (merge T-125; T-128 retires the haircut service in
parallel — it owns other files, no collision expected).
ROOM: THE SWITCHES. (1) NEW `src/lib/site-config.ts` — the dual-driver site
doc, nodeconfig-shaped (dev `data/site-config.json`, prod Blob
`config/site.json`, KV-first when KV_REST_API_* is present, the KV key
tenant-namespaced via src/lib/tenant.ts). Shape: features
(community/classes/store/sessions/cuts/jars/news) · payments
(btcpay/square/stripe — a rail is LIVE only when the switch is ON **and** its
env is configured) · meeting (rail jitsi|vdo|static, jitsiDomain,
allowStaticLinks). Unknown keys sanitized out. Defaults = Love's streamlined
site: only jars+news ON, btcpay+square ON, stripe OFF, rail "jitsi" with
jitsiDomain `meet.${domainForSpace(SPACE_NAME)}`, allowStaticLinks OFF.
`getSiteConfig()` / `saveSiteConfig(patch)`, server-only. (2) NEW `/a/site` +
`/api/admin/site` — operator-gated like every /a room: one card per group,
toggles with plain-English labels + a one-line "what this hides/shows", the
state IN WORDS next to every toggle; payment toggles show env NAMES +
configured/not (never values), greyed with words when unconfigured; the
meeting card carries the jitsi domain field + the rail choice. (3) Consumers
read the doc: NavMenu rebuilds from switches (About/Memberships/Support
always; Sessions/Store/Community gated; News only when `news`; the free
meditation under Community when on, else under Support); SiteFooter gates the
same links; sections.tsx wraps ONLY visibility (community section when
`community`/`classes`, the TipJar when `jars`, the home contact-door CSS hide
reads `cuts`/`sessions`/`community` instead of the hardcoded pair — no copy
moves); `payments.ts liveAdapter` returns null when the rail's switch is OFF
even with env set (stays SYNC — scripts/square-payments.test.mjs holds it
synchronous); BuyPanel offers only live rails, waitlist form when none;
/a/booking takes its jitsi default domain from the doc and hides the
"Zoom / any link" quick-select unless allowStaticLinks. (4) VDO.Ninja rail:
ADD `{ kind: "vdo"; room: string }` to MeetingRail in booking-time.ts
(additive only); /meet/[bookingId] renders an on-site panel for vdo — guest
link `https://vdo.ninja/?room=<bookingId>` for the member, the director link
`https://vdo.ninja/?director=<bookingId>` for the operator's eyes only
(params verified against ~/dev/kimi-code-skills/skills/vdo-ninja).
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the main checkout, or any deployment. Dev server on :3129 only, killed by
recorded PID. KNOWN SEAMS outside OWNS (flagged in SUMMARY, not edited):
spec step 4's "not open yet" panels live on route pages this lane doesn't
own; the console room registry (src/lib/console.ts) doesn't list /a/site;
booking-fulfil.ts + gift/redeem don't yet mint the /meet link for vdo.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push. ENGLISH-PIN. No new dependencies. BFT dating in
comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only
meaning. Module law: no cross-app imports. Derive-or-dash — never a fake
link, number or name.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/lib/site-config.ts` (new) — the dual-driver switches doc
- `src/app/a/site/page.tsx` (new) + `src/app/api/admin/site/route.ts` (new)
- `src/components/NavMenu.tsx` — MENU rebuilt from the switches
- `src/components/SiteFooter.tsx` — the same gates on the footer links
- `src/components/sections.tsx` — visibility wrappers ONLY (Classes section /
  TipJar / the home Contact-door hide)
- `src/components/store/BuyPanel.tsx` — live rails only, waitlist when none
- `src/lib/payments.ts` — `liveAdapter` consults the switch (signature held)
- `src/app/a/booking/page.tsx` — rail defaults only (jitsi domain, static hidden)
- `src/lib/booking-time.ts` — ADD the `vdo` rail kind only
- `src/app/meet/[bookingId]/page.tsx` — the vdo on-site panel
- `tests/site-config.test.ts` (new) — the vitest pins
- `.gitignore` — one line: `/data/site-config.json` (the dev driver file;
  house pattern — every data store carries its line)

Brief: `~/dev/kimi/inbox/TASK-129-oc-site-switches.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` ≥ 36 + the new pins · `node scripts/calendar-view.test.mjs &&
node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs`
· `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of every
changed surface in dark + dawn (own dev server on :3129, stopped by PID
after) → `~/dev/kimi/outbox/task-129/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-129/`
Questions → Number One.
