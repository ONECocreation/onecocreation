# TASK-490 register — the live strip follows Love's reading buttons

Branch `feat/task-490-live-strip`, base `7b33fb6` (main, PR #114).
Block at pickup: 969,090.

## What changed, and why

The Admiral (RULED at block 968,624, over SCOPE-live-strip.md): light
the strip on her Open tap (door `published`, never `cameraShownAtMs`),
YES pulse as a named exception to the idle-motion law for the live dot
ONLY, show EVERYWHERE including /reading, "Join" for everyone (the
page's own unlock offer gates the paid rooms).

Built:
- `src/app/api/live/route.ts` — the additive reading case: the four
  door getters read server-side, EACH in its own try/catch to that
  door's IDLE (the page.tsx belt-and-braces idiom); a `published` door
  yields a candidate, the latest anchor wins; the payload gains
  `kind: "reading"`, `part`, the SCOPE title, `room: null` ALWAYS (the
  minted `oc-<16hex>` Jitsi name never leaves the member routes' gates);
  the reading case wins over the old Go-live flag when both are live;
  the old path (flagLive) is byte-unchanged when no door is published,
  and `afterHours` still computes from the flag alone.
- `src/components/LiveStrip.tsx` — `LiveStripFeed` gains optional
  `kind`/`part`, carried through the fetch mapping; `stripModel` gains
  the reading case with the href DERIVED from `readingPartHref`; the
  old `{live, room}` case keeps its exact shape; the dot span gains
  `className="live-strip-dot"` and KEEPS its inline style (the T-339
  pins at tests/go-live-door.test.ts name `color: "var(--err)"` and
  `fontSize: "1.4em"` in the source, and that file is READ-ONLY — the
  brief's "swap the inline style for the class" would have broken them;
  the class carries the pulse, the inline style carries the look).
- `src/app/kit.css` — `.live-strip-dot` + `@keyframes live-strip-pulse`
  + the reduced-motion still, additive only. kit.css chosen over
  house.css: the strip is site chrome and kit.css imports last
  (`layout.tsx:25`). The glow is a TEXT-shadow of the same `var(--err)`
  token — the dot is a text glyph; a box-shadow would frame the glyph's
  inline box, not the dot.
- `tests/live-strip-reading.test.ts` — NEW: every demanded pin, the
  `/oc-[0-9a-f]{16}/` payload pin among them; the door libs and the
  live flag module-mocked at module scope (the
  stage-honours-the-full-scene idiom).

## Friction

- The named-adds guard refused kit.css until the claim's OWNS named the
  sheet; the claim edit committed WITH the already-staged kit.css
  (staging survives a refused commit) — one commit instead of two, the
  content exactly as intended.
- Two test expectations corrected while building (the mocked flag's
  `kind` is `community` via `roomForSlug("heart-field").kind`, and its
  title is "The Heart Field", not the "— Commons" suffix the strip pin
  passes as feed input) — test-side fixes, the old path untouched.
