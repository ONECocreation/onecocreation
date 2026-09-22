# work-claims/task-402.md — task-402 (ONE Cocreation: W-18 — the news sample says real things, and the editor opens with the letter's words)

Lane: the home crew (Sonnet builder, under Number One's gate). Base = onecocreation main
`ca2b692d25d88533bfea593ef7873237aa8021b2` (PR #48 on #47 on `11ef2f4`), cut at block 968,141.
Branch `feat/task-402-news-sample-real-words`. Worktree `~/dev/worktrees/task-402` (cut by
Number One), `npm ci` already done. Lane ports **4694–4697**.
Brief: `~/dev/kimi/inbox/TASK-402-oc-news-sample-real-words.md`.

Claimed at block 968,142 (house beacon, fresh read at claim time).

## OWNS

- `work-claims/task-402.md` (NEW, this file)
- `src/lib/letters.ts` — the `news-sample` seed's tail `:142-146` ONLY (the `!hero`, subject,
  greeting and body stay byte-identical) — every other seed and export byte-identical
- `src/app/a/letters/page.tsx` — the one `??` line `:142` (the editor's body fallback, mirroring
  the subject chain already at `:141`)
- `tests/letters-send.test.ts` — additive only (existing pins unmodified)

## READ-ONLY (grounding, never edited)

Every other seed in `letters.ts` (especially `:82`, TASK-390's line), `src/lib/mail.ts`
(TASK-390's), `src/app/letters/[key]/page.tsx`, `src/app/meditation/page.tsx`,
`src/app/reading/page.tsx`, `src/components/sections.tsx` + `src/lib/puck-seeds.ts` +
`tests/package-names.test.ts` (TASK-394's), `src/app/cartridge.css` + `src/app/house.css`
(TASK-398's), `scripts/fixture-kv.*` (TASK-399's).

FORBIDDEN (per brief): invented copy (every borrowed line carries its source anchor); any image
not already in `public/images/`; any link to a page that does not exist on main; rewording the
paused visiting-artist section into a stealth keep (SCOPE §14.8 — out until after launch); any
civil-date stamp (block heights only).

## Decision D (SUPERSEDING, from the cut banner)

The brief's own lean for decision D (`!cta: Check All News | /`) is overruled at the cut: the
three `!section` cards' doors already read the house default "Open" (`mail.ts:216`, `:326` —
no text for this lane to add) to their real pages; the big `!cta` becomes
`!cta: Check All News | /news` (verified `/news` renders — `src/app/news/page.tsx` exists,
reads `listPublicLetters()`/`getPuckPage()`, both KV-absent-safe).

Block height at claim: 968,142.
