# work-claim — task-342 (/style signed-in builder marker — MeSwitch + LoginDoor wear the signed-in builder's name, dotted underline, "you are seeing this as <who>" tooltip)

Lane: home crew (Number One sonnet sub-agent). Base = onecocreation main @ **a42e21f or newer**. Branch `feat/task-342-style-builder-marker`.
Worktree cut by Number One; `npm ci` already done. Lane ports **4510–4513**. GO: `~/dev/home/inbox/TASK-342-oc-style-builder-marker.md`.

OWNS: `src/components/style/BuilderMarker.tsx` (new), `src/components/PuckEditor.tsx` (the `operator` prop + provider wrap only), `src/components/style/StyleEditor.tsx` (the `operator` prop only), `src/app/style/[[...slug]]/page.tsx` (the one new prop on `<StyleEditor>` only), `src/lib/puck-blocks/me-switch.tsx`, `src/lib/puck-blocks/login-door.tsx`, `tests/me-puck.test.ts` (the two named assertions only), `tests/login-puck.test.ts` (the two named assertions only), `tests/style-builder-marker.test.ts` (new), this claim.

READ-ONLY: `src/components/me/MeSwitch.tsx`, `src/components/door/DoorSheet.tsx`, `src/lib/puck-config.tsx`, `src/lib/puck-seeds.ts`, `src/lib/operator-auth.ts`, `packages/operator-auth/**`, `src/components/OperatorGate.tsx`, `src/app/api/admin/session/route.ts`, `src/components/BbConsole.tsx`, `src/app/page.tsx`, `src/components/sections.tsx`, everything under `@frens-earth/puck-config`.

Forbidden: env/KV, deploy steps, BFT/date math beyond the given title stamp, any edit inside `packages/operator-auth/**` or the vendored puck-config package, any new color-only signal, any Hero-on-canvas feature, any change to `MeSwitch`/`DoorSheet`'s own component files, any change to `RetreatsList`/`PackagesGrid`/`CartPanel`/`LettersRoom`.

Superseding cut note (Number One, 0018.06.28 a₿): option A only (marker), no Hero-on-canvas; `BuilderMarker` built to work around any child, with optional `note?: string` and `align?: "end" | "center"` (default "end") for future reuse by option B. Mockup shape: label row above block content, right-aligned, uppercase `VIEW` eyebrow + name; name wears dotted underline (2px, offset); tooltip opens below the label on hover AND keyboard focus, text exactly `you are seeing this as <name>`.

cut 0018.06.28 a₿, built 0018.06.28 a₿
