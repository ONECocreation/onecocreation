# WORK-CLAIM — TASK-308 (ONE Cocreation · the mail pill's ink survives a dark-mode client)

CLAIMED-BY: Number One's home-crew sub-agent (Sonnet 5), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.25 a₿ · block 967,178.
SOURCE: the Admiral (0018.06.25): "welcome email - bad button… thought we fixed the coloring in these. it's back." Evidence: `~/briefings/mail/incoming/welcome-day-two-bad-button-0018.06.25.png` — the "Step into the field" pill (`welcome-day-two`) shows a pale rose fill with LINK-BLUE ink; the muted "Unsubscribe" pill below it (white ink on grey) reads fine, untouched.
BRANCH: `feat/task-308`
WORKTREE: `~/dev/worktrees/task-308`
BASE: main @ `7b6f7bfc125a41009ca82617762c04ece0e77841` (worktree cut here; `git merge main` before final gates if main moved).
BRIEF: `~/dev/home/inbox/TASK-308-oc-mail-pill-ink-dark-clients.md`
RUNS IN PARALLEL WITH: T-305 (studio links — disjoint), Ms. Kimi's T-295 pairs (disjoint).

## Ground (re-verified at claim)
- Evidence screenshot read first, confirmed: the primary pill's fill survived (pale rose) but its ink rendered as the client's own link-blue, not the declared plum `#2E0E1D` — same failure mode T-242 (commit 5709c27) tried to armor against with four redundant DARK-ink declarations, all four stripped by the Admiral's mail client's "adapt message colours" dark-mode pass. The muted Unsubscribe pill (`#6b6478` fill, `#ffffff` ink) survived both times.
- `src/lib/mail.ts:274-296` `pill()`: primary variant currently declares fill `linear-gradient(135deg,#E7B2C3,#C56E8B)` with solid fallback `#D890A7`, ink `#2E0E1D` (four ways: td `color`, `<a>` `!important`, `<font color>`, `<span>` `!important`).
- Fix per brief: keep the ink redundancy structure, but flip its LIGHTNESS — white ink survives a "make dark mail readable" pass (it's exactly the ink such a pass leaves alone), a dark ink does not. Fill becomes a deep rose that passes ≥4.5:1 with white ink: `#AD5470` (dawn deep rose, `src/brand/tokens.ts`) computed at **4.908:1** with `#ffffff` (WCAG relative-luminance formula, verified via a throwaway node script) — passes. `#C56E8B` (the old gradient's dark stop) computes at 3.513:1 with white — fails, confirming the brief's note that a gradient may only run between stops that ALL pass; going solid `#AD5470` avoids that risk entirely and is what Build item 1 asks for first.
- Tests pinning the pill: `tests/mail-pill-brand.test.ts` (T-242's regression suite) is the only test file that calls `pill()` with color assertions; grepped `pill(`, `#2E0E1D`, `D890A7`, `E7B2C3`, `C56E8B` across `tests/` — the only other hit on `pill()` itself is `tests/mail-site.test.ts` (href absolutization only, no color assertions, untouched). The `#E7B2C3`/`#C56E8B` hits in `tests/pink-shimmer-doors.test.ts`, `tests/studio-*.test.ts`, `tests/tenant-keys.test.ts`, `tests/letter-site-links.test.ts` belong to the site's `.btn-rose` CSS door and studio-overlay/link-color code — a different subsystem, not `pill()`, out of OWNS.
- `letters.ts`'s `bodyToHtml()` inline-link color `#E7B2C3` (on the dark mail panel, not on a button fill) is a different element entirely — noted under Seams, not touched (OWNS forbids `letters.ts`).
- Puppeteer is not installed anywhere reachable from this worktree (`node_modules`, global npm, no `puppeteer`/`ws` in `package.json` or resolvable) — confirmed by `npm ls puppeteer` (empty) and `require.resolve('ws')` (MODULE_NOT_FOUND). Prior onecocreation lanes hit the same wall (task-135/138/153/157 SUMMARYs) and used raw CDP over system `chromium --remote-debugging-port` with Node's native `fetch`/`WebSocket` (Node 26, no added dependency) instead. Following that house convention for the two render shots; noted as a deviation from the brief's literal "puppeteer" wording in the SUMMARY.

## Build (plan)
1. `pill()` primary: fill → solid `#AD5470` (bgcolor + background-color, no gradient), ink → `#ffffff` declared the same four ways, docblock rewritten honestly (what T-242 assumed, what the 0018.06.25 screenshot showed, why white).
2. Muted variant: untouched.
3. Render proof: a `npx tsx` script (outbox, harness-only) calling `letterHtml()` on the real `welcome-day-two` template text, screenshotted at 700px via CDP/system chromium in two passes (as-is, and with a "dark-mode strip" step matching the T-242 test's strip) — both read.
4. `/a/letters` preview shot check — say whether it renders `pill()`.

## OWNS
`src/lib/mail.ts` (pill + its docblock only), `tests/mail-pill-brand.test.ts` and any other test pinning the pill's colours, `work-claims/task-308.md`. NOT: `letters.ts`, templates' words, the shell layout, anything else.
