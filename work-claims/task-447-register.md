# TASK-447 register

Block: 968350
Status: BLOCKED at full Vitest gate; scoped implementation and proof complete. Not accepted.
Base: 336313a411727345bc7d39839fd8175841113b39
Branch: feat/task-447-memberships-night-lion
Evidence: /home/pac/dev/hermes/outbox/task-447-gpt-6-astra/

## Implementation

src/app/cartridge.css:547-550 replaces only the prior comment and main-only modifier with the Admiral's ruling and:

    main.lions-gate-dark.lion-in-band section{background:transparent!important}

The existing page night background supplies the lion. Image sizing and position are unchanged. Dawn CSS, hand-built markup, applyLionToPuck, and studio-publish pins are untouched.

## Changed assertion register (base line -> final line)

All changed assertions are in tests/memberships-lion.test.ts, within the existing it block at line 70.

- Old :73 `expect(modifier).not.toBeNull()` -> new :73 `expect(css).not.toMatch(/(?:^|\n)main\.lions-gate-dark\.lion-in-band\s*\{/)`. The main-only modifier must now be absent, including whitespace variants.
- Old :74 `expect(modifier![1].trim()).toBe("background:linear-gradient(rgba(10,10,20,.62), rgba(10,10,20,.78));")` -> new :72 `expect(css).toContain('main.lions-gate-dark.lion-in-band section{background:transparent!important}')`. Pins the binding transparent-band rule rather than the removed veil-only declaration.
- Old :75 `expect(modifier![1]).not.toMatch(/url\(|!important/)` -> new :75 `expect(night).not.toBeNull()` and :76 `expect(night![1]).toContain('url("/images/lions-gate.webp") center top / cover no-repeat')`. The base night rule must still supply the page lion with its existing framing.
- Old :79 `expect(dawn![1]).toContain('url("/images/lions-gate.webp") center top / cover no-repeat')` -> new :79 `expect(dawn![1]).toBe('\n  background:\n    linear-gradient(rgba(251,246,239,.82), rgba(251,246,239,.9)),\n    url("/images/lions-gate.webp") center top / cover no-repeat;\n')`. Strengthens the dawn pin to the complete unchanged declaration body copied from source.

Non-assertion changes: :70 test title now names designer bands revealing the page's night lion; the obsolete modifier match and specificity comment are replaced by the base night match. Dawn existence at :78 and dawn section transparency at :80 remain byte-identical. All assertions outside this it block, including tests/studio-publish.test.ts, remain byte-identical.

## Execution receipts

RED command: npx vitest run tests/memberships-lion.test.ts
Observed expected failure at the missing transparent-band assertion; full output in red.log.

    Test Files  1 failed (1)
         Tests  1 failed | 8 passed (9)

GREEN command: npx vitest run tests/memberships-lion.test.ts tests/studio-publish.test.ts
Full output in green.log.

    Test Files  2 passed (2)
         Tests  22 passed (22)

Full gate commands and raw output are in gate-1-vitest.log through gate-5-build.log and copied into SUMMARY.md.

Vitest:
    src/app/cartridge.css -- important: measured 25, ceiling 24
    Test Files  1 failed | 221 passed (222)
         Tests  1 failed | 2770 passed (2771)
    EXIT_CODE=1

Script loop, ESLint, TypeScript, and next build each:
    EXIT_CODE=0

Build and test warnings are retained in the raw logs, not suppressed. Independent diff-only review passed; review.json records the verdict. No baseline rollback or ceiling adjustment was performed.

## Proof shots

Method: production https://www.onecocreation.com/memberships, as served, followed by CSSOM deletion of the exact T-413 main-only rule and injection of the lane's literal rule read from cartridge.css. No remote writes. Isolated headless Chromium; viewport-only screenshots. proof.py, proof.log, shots/manifest.json and shots/page-errors.json retain reproduction and computed-style evidence.

- shots/production-night-1080x1920.png
- shots/injected-night-1080x1920.png
- shots/production-night-1440x900.png
- shots/injected-night-1440x900.png
- shots/production-night-390x844.png
- shots/injected-night-390x844.png
- shots/production-dawn-1080x1920.png
- shots/injected-dawn-1080x1920.png

Command receipts:
    PASS night/dawn page framing parity: 1080x1920
    PASS night/dawn page framing parity: 1440x900
    PASS night/dawn page framing parity: 390x844
    Viewport-only screenshot count: 8
    Browser page errors: []
    PASS dawn PNG hashes identical before/after injection

Browser helper failed to locate its DevTools endpoint. The alternative isolated Chromium session succeeded. An initial networkidle navigation timed out; domcontentloaded plus explicit selector, fonts, and decoded lion readiness succeeded. No live deployment or fixture-KV preview was performed. Contrast ratios: not run; no colors or fonts introduced.

## Seams

The binding transparent-band rule introduces !important, exceeding the committed cartridge ceiling. tests/design-drift.ceilings.json:4 is outside OWNS and untouched. The exact minimal mechanical ceiling adjustment would be:

    --- a/tests/design-drift.ceilings.json
    +++ b/tests/design-drift.ceilings.json
    @@
         "src/app/cartridge.css": {
    -      "important": 24,
    +      "important": 25,

This is NOT applied or authorized: the ratchet explicitly says never raise the ceiling. Number One must reconcile the binding CSS with that rule and authorize a scoped exception or revise the contract. No alternative CSS or unrelated !important removal was substituted.

Number One still owns the independent fixture-KV build walk, ACCEPTANCE, push and PR. The Admiral's hand test remains pending.
