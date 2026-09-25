# TASK-464 register

## What changed
- `ReadingStage.tsx` published state: "Watch Love live" is now `kit-btn kit-btn-main kit-btn-sm` (was `kit-btn kit-btn-main`), with a short comment matching TASK-463's, above the link.
- `ReadingStage.tsx` Playground banner: the kicker `<p className="kicker">Stage 2 · the Playground</p>` is now `<p className="kicker">The Playground</p>`. The h2 "Want an encore?", the body line and the "Go to the Playground" link are untouched.
- `ReadingStage.tsx` doc comment (TASK-457, ~line 33): re-trued — it used to say every re-routed Watch control (published/ended/left) shared "the same `kit-btn kit-btn-main` class"; that stopped being true the moment published alone picked up `kit-btn-sm`, so the sentence now names TASK-464 and says ended/left keep the full-size class.
- New test `tests/reading-small-watch-464.test.ts` pins: (a) published renders exactly one `kit-btn kit-btn-main kit-btn-sm` link labelled "Watch Love live"; (b) `playgroundOpen: true` renders `<p class="kicker">The Playground</p>` and neither the rendered body nor the source contains "Stage 2 · the Playground"; (c) "Watch again" (published+ended, published+left) stays `kit-btn kit-btn-main` with no `kit-btn-sm`; (d) no `→` or emoji in any /reading button label across seven phase combinations.

## Why (the Admiral's two answers, block 968,548)
1. The Playground banner kicker drops "Stage 2 · " — it reads "The Playground" alone.
2. The published "Watch Love live" link becomes the small kit button. Per the T-463 register (block 968,543): `.kit-btn` never wraps, and the full-size button measured 322 px wide against production's 360 px-phone card (clip box 316 px) — the T-463 register noted it "bleeds 3 px past each card edge" at that width, which is why it was left alone at the time (words survived) but is now shrunk on the Admiral's own call. "Watch again" (ended/left) and "Try again" stay full size — their labels are short and fit both phones.

## Pins re-trued
- `tests/reading-buttons-phone-463.test.ts:48` (was "keeps the full-size button", `kit-btn kit-btn-main` → renamed "…is the small button too, since TASK-464 (block 968,548)", regex now `kit-btn kit-btn-main kit-btn-sm`).
- `tests/reading-watch-heart-field-457.test.ts:57-61` (`kit-btn kit-btn-main` → `kit-btn kit-btn-main kit-btn-sm`, title now says "(the small size since TASK-464)", mirroring the closed-state test at :77-81).
- `tests/reading-playground.test.ts:32-33` (doc comment: `Stage 2 · the Playground` → `The Playground`, TASK-464 named, old string kept for history).
- `tests/reading-playground.test.ts:177-178` (source pin: added `expect(src).toContain('<p className="kicker">The Playground</p>')` and `expect(src).not.toContain("Stage 2 · the Playground")`; the existing "Want an encore?" / "Go to the Playground" / href / no-arrow / stage2-poll pins on the same test are untouched).
- `tests/reading-stage.test.ts:41-46` (doc comment: new TASK-464 paragraph after the TASK-457 one, points at the new test file).
- `tests/reading-stage.test.ts:118` → now :125-129 (closed/no-banner negative assertion, `playgroundOpen: false`): `Stage 2 · the Playground` → added `not.toContain("The Playground")` ahead of the retired-string check, so the negative pin still means something once the kicker text changed (verified no other text in this render contains "The Playground").
- `tests/reading-stage.test.ts:194` → now :205-207 ("while Stage 2 is open the banner shows"): `Stage 2 · the Playground` → `<p class="kicker">The Playground</p>` (exact rendered line) plus a negative pin on the retired string.
- `tests/reading-stage.test.ts:312` → now :325-327 (source pin, "the banner replaced the Stage 2 card…"): `Stage 2 · the Playground` → `<p className="kicker">The Playground</p>` (exact JSX line) plus a negative pin on the retired string.
- `tests/reading-stage.test.ts:99-104` — "exactly ONE kit-btn-main" — verified, not changed: `kit-btn-main` is a substring of `kit-btn-main kit-btn-sm`, so the count still holds at 1 for the published render.
- `src/components/reading/ReadingStage.tsx:~33` — the TASK-457 doc comment claiming every re-routed Watch control shares "the same `kit-btn kit-btn-main` class" was no longer true once published alone picked up `kit-btn-sm`; re-trued to name TASK-464 and say ended/left keep the full-size class.

## Obstacles
None. The claim's OWNS list matched a full-repo grep for both the old kicker string and the "Watch Love live" label exactly — no file outside `src/components/reading/ReadingStage.tsx` and the five listed test files references either string.
