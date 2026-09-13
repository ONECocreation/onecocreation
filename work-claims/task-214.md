# WORK-CLAIM — TASK-214 (ONE Cocreation: the letters desk)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac) — Track B, alone
CLAIMED-AT: 0018.06.22 a₿ · block 966,809
BRANCH: `feat/task-214-letters-desk`
WORKTREE: `~/dev/worktrees/task-214`
BASE: main tip `690ca0a` (T-198 follow-through — vitest base **629 across 58 files**, green at cut).
BRIEF: `~/dev/kimi/inbox/TASK-214-oc-letters-desk.md` (cut 0018.06.22 a₿ from the 0018.06.18 Love call items #6, #7) · grounding `~/dev/kimi/inbox/refs/T210-216-GROUNDING.md` §T-214 (re-grepped at cut — every mapped path exists at `690ca0a`).

SEEN BROKEN LIVE (call record): bold/italic toolbar does nothing (00:27:34) — root cause read at cut: the buttons append the literal string `**text**` to the END of the body (`wrap()` → `insert()`), never touching the selection. Emoji + straight paste must land as typed (00:27:39). No preview found (00:29:37); preview should open a side panel (00:27:52) — grounding: NOT FOUND, this lane builds it NEW. The letter email arrives on a white ground, wrong color, old logo (00:30:50–00:31:07) — root cause: `brandShell()` is white-ground (`#faf7f2`) with a 44 px mark + text wordmark, `richShell()`'s card is `#ffffff` on `#f4f0e9`; the NEW logo is the raylit lockup (`cartridge.ts logo.lockup` = `/brand/onecocreation-lockup-raylit.svg`; its email render `/brand/onecocreation-lockup-email.png`, confirmed a live mark by T-179/TASK-179). Receipt sent 3× on 3 clicks (01:21:38–01:22:37) — the send panel has no in-flight guard.

OWNS (grounding §T-214, verified at cut):
- `src/app/a/letters/page.tsx` — the desk: compose + toolbar + the NEW side-panel preview
- `src/app/a/letters/[key]/page.tsx` — the send panel (debounce/disable in flight)
- `src/lib/letters.ts` — `letterHtml()` / `bodyToHtml()` (paste breaks, emoji, link color)
- `src/lib/mail.ts` — `brandShell()` / `richShell()` / `pill()` (dark ground, her palette, the raylit lockup)
- `src/app/api/admin/letters/route.ts`, `src/app/api/admin/letters/send/route.ts` — the send route (idempotency)
- NEW: `src/app/api/admin/letters/preview/route.ts` — the preview's server render (same `letterHtml()` the send route fires; mail.ts imports nodemailer, so the preview can NOT be computed in the client bundle)
- NEW: `src/lib/letter-marks.ts` — the toolbar's pure mark helpers (wrap/toggle/link at the textarea selection; the desk stays a thin wire over them)
- tests: `tests/task-214-letters-desk.test.ts` (new) + updates to `tests/mail-site.test.ts` (its pins name the OLD white shell's `onecocreation-mark.svg` src — the G4 siteBase() point stays, the asset assertions follow the new shell)

NOT OWNED (seams if they need a touch): the letters' storage schema (KV keys untouched — no shape change) · `src/lib/mail-booking.ts`, `lead-magnet.ts`, `pwyc-letters.ts`, `gift-vouchers.ts`, `entitlement-fulfil.ts`, `cart-reminders.ts`, `order-receipt.ts`, `live.ts`, booking change + auth email routes (brandShell NEIGHBOURS — checked at cut: their inline gold `#b4862b` clears 4.5:1 on the new dark ground; the ONE failure found is `pwyc-letters.ts` L189 `color:#6b6478` ≈3.1:1 on `#141021` — minimal-forced-edit, one hex, justification in SUMMARY) · the unsubscribe + offer-action LANDING PAGES (light `#faf7f2` — web pages, not the email; flag-only).

SQUARE RECEIPT (#7: no product description, unreadable order number, no branding; 3× on 3 clicks): confirmed Square-side at cut. The card rail is Square's hosted Payment Link (`src/lib/payments.ts` createCharge → POST /v2/online-checkout/payment-links) — Square hosts the card form AND sends its own automatic receipt; no site code sends any Square receipt. The house's own receipt letter (`order-receipt.ts`) is once-per-settle by a SET NX marker. FLAG-AND-STOP: the template and the resend behavior live in the Square Dashboard — operator runbook in SUMMARY.

GATES (verbatim into SUMMARY): `vitest run` (base 629/58 pasted; must grow) · all `scripts/*.test.mjs` · `eslint` 0 · `tsc --noEmit` · `next build`. Shots: compose with toolbar marks applied, paste + emoji, the side-panel preview, the rendered email — both themes × 1440/390, own dev server on :3214 (never :4100, never the live site) → `~/dev/kimi/outbox/task-214/shots/`.

LAW: BFT dating everywhere (computed, never hand-typed) · derive-or-dash · no secrets, never read `.env*` (the worktree carries none) · never the live site/vault · never push · never archive · no bare `git stash` · no new dependencies · mail transport mocked in every test (nodemailer vi.mock / stubbed fetch — nothing ever connects) · gold-is-money: decorative gold in the letter mail follows T-121's pink pass (rose family), money gold untouched · OC is PRODUCTION: land the same watch, no half-shaped main. Report → `~/dev/kimi/outbox/task-214/SUMMARY.md`, ends `LANE-DONE <full sha>`. Questions → Number One.
