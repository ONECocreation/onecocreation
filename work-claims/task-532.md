# WORK-CLAIM - TASK-532 - ONE Cocreation: /replays for members (a free membership is enough), the ruled player-on-top look, and a YouTube PLAYLIST as a source

CLAIMED-BY: Ms. Kimi's crew (builder subagent)
CLAIMED-AT: block 969,334+ (the Admiral LIFTED THE PAUSE on this lane, his word, 2026-09-30; the round-2 NOD look is ruled)
BRANCH: `feat/task-532-replays-members-and-playlist`
WORKTREE: `~/dev/worktrees/task-532`
BASE: main at cut = `8ef0363cb879693eb23fffa6d839c66704398708` (origin/main; T-493, T-498, T-499 merged). Verified at pickup: worktree HEAD == base.
LANE PORTS: 5276-5279
BRIEF: `~/dev/kimi/inbox/TASK-532-oc-replays-members-and-playlist.md` (RULINGS + RELEASE block 969,313; round-2 rulings and the round-2 NOD block 969,334 supersede the body's Build 1 hide-the-list gate)

## The lane in one line
/replays keeps its "Read with Love" header and shows the newest recap in a full-width 16:9 player on top with mini thumbnails below that swap into the top player (all replays, no max); titles and thumbnails are PUBLIC (Love's public /images/reading-love-cover.jpg stands in for every video picture when signed out) and only the PLAYER iframe is gated to any valid member session (a free email membership is enough - sessionsFromCookieHeader, NOT tierForSubject; fail-closed); signed-out taps deep-link /login?next=%2Freplays%3Fplay%3D<id> and /replays?play=<id> loads a saved id in the top player (anything else falls back to the newest); /reading's door becomes the ruled BOOK door "Catch the replays" beside reading-book-thumb.webp; one kit-btn-second kit-btn-sm "Want a reminder email?" to /reading#keep-posted; and a YouTube PLAYLIST (its own KV doc replays:playlist:<TENANT>, its own operator route and card field) auto-fills the list behind the manually pinned rows (newest first by published, deduped by id, last-good cache, strict id, constant host only, no redirects, 4s timeout, ~512KB cap).

## OWNS (from the brief, verbatim, with the round-2 NOD additions folded in)
`work-claims/task-532.md` + `work-claims/task-532-register.md` (NEW) · `src/app/replays/page.tsx` · `src/lib/youtube-id.ts` (the new export only) · NEW `src/lib/replays-source.ts` · NEW `src/app/api/admin/replays-playlist/route.ts` · `src/app/a/site/replays/ReplaysCard.tsx` · `src/app/a/site/replays/SiteReplaysRoom.tsx` (the intro line only) · `tests/replays.test.ts` (only pins the gate honestly breaks) · NEW `tests/replays-members-532.test.ts` · NEW `tests/replays-playlist-532.test.ts` · `src/components/replays/ReplaysList.tsx` (NOD) · `src/app/reading/page.tsx` (the door section and the one id) (NOD) · `src/app/kit.css` (the new kitx rules only) (NOD). WIDENED at red-first commit: NEW `tests/fixtures/playlist-feed-532.xml` (the recorded real feed the playlist suite parses - the brief's "a recorded fixture XML"; the brief named no fixture path, so the claim names it).

READ-ONLY: `src/lib/site-config.ts`, `src/app/api/admin/site/route.ts`, `src/middleware.ts`, `next.config.ts`, `src/lib/letters.ts`, `src/components/rooms/ReadingSignInBox.tsx` (the id lands on the page's own section, not the box). Disjoint from T-531 (middleware/next.config.ts/its test), T-533, T-534 (consumes loadReplays after this lane merges), T-493 (src/app/a/letters, src/lib/letters.ts), T-498 (store/support files), T-499 (site-config.ts, /a/site/reading, reading components).

## Adjacency noted at cut
- T-499 (housewarming switch) MERGED into the base: its site-config.ts and reading-page edits are on the cut tip; this lane's /reading edit is the Replays door section and the keep-posted id only, disjoint from the switch logic.
- T-531 (CSP) owns src/middleware.ts and next.config.ts: the feed here is a server-side fetch, nothing here is frame-src, no CSP touch.
- T-534's recap half is HELD until THIS lane merges (it calls loadReplays).
