# TASK-457 register

Base: 9db8532a23e01f705b2fb8a53d8d976f49fa1f99
Code/pins revision: 20936ca (this register rides on top)
Builder: Number One
Block: 968,543
Brief: /home/pac/dev/briefings/oc-sat-lanes-968543/TASK-457-reading-watch-heart-field.md
Governing ruling: the Admiral, block 968,516 (tracker notes w482-where-reading + w482-email-to-watch)

## What was built

`src/components/reading/ReadingStage.tsx` (`ReadingStageBody`'s control branches only):
- Published control: the "Watch Love live" `<button onClick={onWatch}>` becomes `<Link href="/rooms/heart-field" className="kit-btn kit-btn-main">Watch Love live</Link>` — same label, same class. Its quiet line changes from "One tap starts her picture and sound." to "It plays in the Heart Field. Sign in with your email if you haven't yet. It's free."
- Closed control (the plain closed state, not ended/failed/left): keeps its body paragraph verbatim; gains a new `kit-btn-row` with `<Link href="/rooms/heart-field" className="kit-btn kit-btn-main">Go to the Heart Field</Link>`; its quiet line changes from "Your Watch button appears right here when Love goes live." to "The reading plays in the Heart Field. Your Watch button appears right here when Love goes live."
- The two other "Watch again" controls that used to call `onWatch` (ended-while-published, left-while-published) become the same `Link` to `/rooms/heart-field`, label unchanged ("Watch again").
- `onWatch` is dropped from `ReadingStageBody`'s destructured parameters (no control calls it any more) but stays in the `ReadingStageBodyProps` type and is still passed by the wired `ReadingStage` component, whose click-time fresh-fetch `watch()` stays reachable through `onTryAgain → tryAgain() → watch()` — the viewer-mount code (poll, `watch()`, `viewerEnded()`, the `watching && room` JitsiViewer branch) is untouched, per the brief's "leave the island's viewer code in place."
- The Playground banner, the countdown, and the cover `<img>` lines (:150-157, PR #81's territory) are untouched — confirmed by diff before committing.

`src/app/a/site/reading/Stage1Card.tsx`: the `published` line in `PHASE_WORDS` changes from "Published — viewers can watch on /reading." to "Published — members watch in the Heart Field. /reading sends them there."

`tests/reading-watch-heart-field-457.test.ts` (NEW, 13 tests): the published body's link (href, class, label), its new quiet line, and that it mounts no room/viewer/iframe; the closed body's new link and quiet line, with the old body paragraph pinned unchanged; the ended-while-published and left-while-published Watch-again links; a source pin that `ReadingStage.tsx` never writes `onClick={onWatch}` and that `ReadingStageBody`'s own destructuring never names `onWatch`; a sweep across every rendered phase confirming no `<button>` names "Watch" (Try again is the one legitimate remaining button, and never calls onWatch); the Stage1Card published words, by source pin and by rendering `Stage1CardBody`.

`tests/reading-stage.test.ts`: one pin re-trued (see below); every other assertion in the file is unmodified and still passes because the labels ("Watch Love live", "Watch again", "Go to the Heart Field" is new) and the `kit-btn-main` class held.

`tests/reading-page.test.ts`, `tests/reading-look.test.ts`, `tests/door-machine.test.ts`: read, not edited. Their "no `/rooms/` href" pins are about `src/app/reading/page.tsx`'s own source (the SSR page never hardcodes a room href — the link lives inside the client island, `ReadingStage.tsx`), so they remain true untouched; verified by running them (all green, see Gates below).

## Pins re-trued

1. `tests/reading-stage.test.ts`, describe "published, not yet watching" (renamed from "…one tap starts her picture and sound" to "…Watch Love live sends the visitor to the Heart Field (TASK-457, block 968,543)"): the assertion `expect(html).toContain("One tap starts her picture and sound.")` → `expect(html).toContain("It plays in the Heart Field. Sign in with your email if you haven&#x27;t yet. It&#x27;s free.")` (React's `renderToStaticMarkup` escapes `'` to `&#x27;`, matching this repo's own convention — see `tests/kit-components.test.ts`, `tests/meet-studio.test.ts`, etc.). Reason: the old words promised an in-place mount; the Admiral's ruling retired that promise. Every other assertion in that `it` (the chip, the book, the single `kit-btn-main`, the "Watch Love live" label) is unchanged and still passes, because the control is still a `kit-btn-main`-classed element labelled "Watch Love live" — only its type (`Link` vs `button`) and its quiet line changed.
2. File-header JSDoc comments in `tests/reading-stage.test.ts` and `src/components/reading/ReadingStage.tsx` gained TASK-457 paragraphs recording the reversal; no assertion text in either comment was a pin.

No other pin needed re-truing. Searched for every other occurrence of the changed words/behaviour across `src/` and `tests/` before starting (`grep -rln` for "One tap starts her picture and sound", "Your Watch button appears right here", "viewers can watch on /reading", "Watch Love live", "Watch again", "onWatch"): the only hits outside this lane's OWNS were `src/components/rooms/StoryTimePill.tsx` and `src/components/ArtistRegistry.tsx`, both unrelated `onWatch` props on different components (the Heart Field's own Story Time pill; an unrelated artist watchlist feature) — left untouched.

## Deviations from the brief

None. The build matches the brief's four numbered steps exactly; `src/app/reading/page.tsx` needed no change (step 5 said none unless a pin required it — none did).

## Open questions for the Admiral

None real. (The brief's own ground truth already answers the one thing that might otherwise be a question: a plain link to `/rooms/heart-field` already gets a signed-out visitor through sign-in and back via `next=`, so no new wiring was needed for the "after they sign in, route them to the Heart Field" half of the ruling.)

## Gates (actual output)

`~/dev/shortcuts/oc-gate.sh /home/pac/dev/worktrees/task-457`:

```
 Test Files  230 passed (230)
      Tests  2897 passed (2897)
scripts/calendar-view.test.mjs: 70 passed, 0 failed
scripts/cartridge-identity.test.mjs: 179 passed, 0 failed
scripts/console-matrix.test.mjs: 14 passed, 0 failed
scripts/fixture-kv.test.mjs: 45 passed, 0 failed
scripts/square-payments.test.mjs: 58 passed, 0 failed
eslint 0
tsc 0
build ok
GATES GREEN
```

Baseline at cut (on 9db8532, before any lane commit): 229 files / 2884 tests, all green. Final: 230 files / 2897 tests, all green — the suite grew by this lane's own 13 new pins, no existing assertion count shrank.

## Verification

Red tests committed before the build (44497d6 — implementation temporarily set aside with a scoped, tagged `git stash push -u -- <the two source files>` so the new/changed test file(s) ran against the pre-lane source; 12 of 42 tests in the two touched files failed, exactly the ones this lane's words/behaviour change touches; the stash was then re-applied by its captured SHA, verified, and dropped). Then the build commit (20936ca) turned all 12 green with no other regression (full suite 230/230 files, 2897/2897 tests).

## Obstacles

- The house's `case` pattern in the `named-adds` pre-commit hook quotes its OWNS-derived pattern variable (`case "${path}" in "${own}")`), which disables shell glob matching — a claim's OWNS entry like `` `work-claims/task-457*.md` `` is matched LITERALLY, not as a glob, and the first commit was refused. Fix: list both `work-claims/task-457.md` and `work-claims/task-457-register.md` as separate literal backtick paths in OWNS. Worth flagging for whoever writes the next claim file: only an exact path, or a directory ending in `/` (prefix match), passes this hook — a filename glob does not.
- Next's `Link` renders its `class` attribute BEFORE `href` in static markup (`<a class="kit-btn kit-btn-main" href="/rooms/heart-field">`), not in the JSX-source attribute order (`href` then `className`). A first draft of the new test file's regexes assumed source order and failed even after the build was correct; fixed by reading the actual rendered string and matching its real attribute order.
- React's `renderToStaticMarkup` HTML-escapes apostrophes to `&#x27;`; the new quiet line's "haven't"/"It's" needed that literal entity in the test's expected string, not a real apostrophe (confirmed against this repo's own existing convention in several other test files before writing the assertion).
