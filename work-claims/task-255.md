# WORK-CLAIM — TASK-255 (ONE Cocreation: every square door wears the pink gradient with the shimmer)

CLAIMED-BY: Number One (Claude Fable 5.1), solo lane, no parallel runs.
CLAIMED-AT: 0018.06.24 a₿, lane opened same watch.
BRANCH: `lane/task-255`
WORKTREE: `~/dev/worktrees/task-255`
BASE: main @ `ac5eda5` (T-252/253/254/256 merged; main = 1080 vitest) — re-verified at claim time (`git log -1` on the worktree matched).
BRIEF: `~/dev/home/inbox/TASK-255-oc-pink-shimmer-buttons.md`
SCOUT: `~/dev/home/outbox/scout-buttons-0018.06.24.md` (line numbers from main 45187c9; re-found every site by its words).

## Ground (re-grepped at claim)
- `src/app/house.css:77-82` `.btn` was the WHITE square base (`background:#fff;color:var(--btn-ink)`); `.btn-rose` (`:90`) already carried T-121's plum-ink rose gradient (`9.65 / 7.57 / 4.99:1`); `.btn-shimmer` (`:376-380`) was a standalone sweep, used in exactly 3 places (`memberships/page.tsx:153`, `services/page.tsx:149`, `CartPanel.tsx:549`), always paired with `btn` (or `btn btn-gold`) in markup — never with `btn-rose`.
- `.btn-rose` is always paired with bare `btn` in every source file (`SubscribeForm.tsx`, `ServiceCard.tsx` ×2, `EmailDoor.tsx`, `DoorSheet.tsx`, `sections.tsx`, `about-content.ts`, `ManageBooking.tsx`) — confirmed by grep before editing, so `.btn-rose` needs no shimmer rule of its own; `.btn`'s own `::after` covers it.
- The console selector the brief suggested (`.mgmt-body`) is **not** console-exclusive — grep found it also used bare on 12 PUBLIC single-card pages/components (`/live`, `/gift/[voucherId]`, `/rooms/[slug]`, `/me/calendar`, `/artist`, `/bb`, `/bday`, `/media`, `/meet/[bookingId]`, `/privacy`, `/terms`, `FrenProfile.tsx`, `OperatorGate.tsx`) — several of which are on the scout's own door list (`/live` #3, `/gift/[voucherId]` #4). Killing the sweep at bare `.mgmt-body` would have silenced pink+shimmer on public doors it should light up. The actual console-only wrapper is `.mgmt-shell` (`div className="mgmt-wrap mgmt-shell"`), rendered ONLY by `SiteConsoleShell.tsx` (T-234's /a convergence, mounted by `src/app/a/layout.tsx` when `CONSOLE_CHROME === "site"`, onecocreation's live config — confirmed via the shots harness's own `NEXT_PUBLIC_CONSOLE_CHROME=site`). Used `.mgmt-shell .btn::after{content:none}` instead of the brief's illustrative `.mgmt-body` guess.
- `.btn-teal` is declared but has zero live usages in `.tsx` today; `.btn-round`/`.btn-quiet` are almost always standalone (no bare `.btn` alongside) — added their `::after{content:none}` anyway per the brief's explicit 6-class list (cheap insurance if ever combined).

## Build (as executed)
1. `house.css` `.btn`: background/color flipped to the exact `.btn-rose` paint (`linear-gradient(135deg,#E7B2C3,#C56E8B)` / `var(--rose-btn-ink)`), added `position:relative;overflow:hidden`, added `.btn::after` (the sweep, moved verbatim from `.btn-shimmer::after`). `.btn-shimmer{}` is now an empty no-op alias (kept so `btn btn-shimmer` / `btn btn-gold btn-shimmer` markup and any string match still holds); `@keyframes rose-shimmer` stays put, `.btn::after` reads it regardless of file order.
2. One combined override rule: `.btn-gold::after,.btn-ghost::after,.btn-teal::after,.btn-on::after,.btn-quiet::after,.btn-round::after{content:none}` — placed immediately after `.btn::after` so equal-specificity cascade order always favors it, independent of where each class's paint rule sits elsewhere in the file.
3. `.mgmt-shell .btn::after{content:none}` for the /a console (see Ground above for why not bare `.mgmt-body`).
4. `prefers-reduced-motion` block: `.btn-shimmer::after{animation:none}` → `.btn::after{animation:none}` (the real rule now lives there).
5. Six utility sites → `btn btn-sm btn-ghost` (+`btn-on` when active), real doors left bare `btn`:
   - `MemberCalendar.tsx` Week/Month toggles (was `:133-134`) and the Location/Copied button (was `:202`).
   - `VantageSwitcher.tsx:28` Stage/Lesson Path/Events — also dropped its inline gold-gradient active-state hack (replaced by `btn-on`).
   - `Kind0Doors.tsx` Copy invite (`:242`, `btn-on` when copied) + Mint a connect invite (`:260`, plain ghost).
   - `SignerDoors.tsx` same pair (`:176`, `:192`).
   - `LessonPathView.tsx:245` mark done (`btn-on` when `done.has(...)`).
6. `services/page.tsx` "Get started today" → "Get Started Today", matching `memberships/page.tsx`.
7. New test file `tests/pink-shimmer-doors.test.ts` (17 tests): the base-flip CSS pins, the 6-class no-shimmer pins, the `.mgmt-shell` (not bare `.mgmt-body`) console scope, a grep-pin against any public CSS file reintroducing `background:#fff` on a `.btn`, the six utility sites wearing ghost/on, the "one string" pin, and that the four do-not-edit files' `btn-rose` class strings are byte-identical to before.
8. Files NOT touched, per the brief's law: `SubscribeForm.tsx`, `ServiceCard.tsx`, `EmailDoor.tsx`, `about-content.ts` — no class string in any of them reordered (verified by test + `git diff`).

## Gates (all from the worktree)
- `npx vitest run` → 1097 passed (106 files) — main baseline 1080 + this lane's 17 new.
- `node scripts/calendar-view.test.mjs` → 70 passed.
- `node scripts/cartridge-identity.test.mjs` → 181 passed.
- `node scripts/square-payments.test.mjs` → 58 passed.
- `npx eslint .` → 0 problems.
- `npx tsc --noEmit` → clean.
- `npx next build` → Compiled successfully.

## Legibility
Shimmer overlay `rgba(231,178,195,.4)` is the SAME hue as the gradient's light stop (`#E7B2C3`) at 40% alpha — compositing it over any point on the `.btn` gradient can only move that pixel's color TOWARD the light stop, never past the dark stop's darkness. So the worst-case contrast across the whole 5.2s cycle is unchanged from the static T-121 floor (4.99:1, at the dark stop, wherever the sweep hasn't reached); measured the sweep's actual peak-overlay case at the dark stop (`#C56E8B` blended 40% toward `#E7B2C3` = `rgb(210.6,137.2,161.4)`) against `--rose-btn-ink` `#2E0E1D`: **6.58:1** — higher, not lower. Full numbers in SUMMARY.md.

LANE-DONE pending shots + commit.
