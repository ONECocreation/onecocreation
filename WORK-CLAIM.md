# WORK-CLAIM — TASK-128 (retire the haircut service everywhere it still lives)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: 0018.06.16 a₿ (block 965,942)
BRANCH: `feat/task-128-retire-haircut-service`
WORKTREE: `~/dev/worktrees/task-128`
BASE: main tip `08b55b0` (merge T-126 — the last public haircut strings are
already out of the components; what remains is copy and ids).
ROOM: Love no longer offers haircuts (Sept 1). One lane, four moves. (1)
/support's MORE_DOORS "Book a session" entry reads "a discovery call or a
soul conversation" — the "silent cut" phrase leaves. (2) /services, /about,
/contact lose the "Silent Hair Session(s)" / "ConsciousCuts & Waxing"
offers from PUBLIC copy — surrounding sections stay; a section that is only
hair (the /services ConsciousCuts hero, "IS A SILENT HAIR SESSION FOR
YOU?", the chair testimonials; the /contact "How do I get a Silent Hair
Cut?" FAQ) is removed whole. Reference/admin tooling keeps the words. (3)
`src/lib/booking.ts`: the `silent-haircut-*` services are marked
`retired: true` — NEVER deleted, existing bookings and receipts reference
the ids. `listServices` drops retired services from every listing (hidden
or not), so no picker/chooser/sitemap/public shelf can show them;
`getService` still resolves them, flagged, so an old receipt still renders.
(4) New vitest `tests/booking-services.test.ts`: retired services absent
from the public list (both modes), and an old booking on a retired id still
serves its receipt view. The final gate grep (`grep -rniE "haircut|hair
session|silent cut|consciouscuts" src/app src/components`) rides the
SUMMARY verbatim with every hit classified; hits in files OUTSIDE this
lane's OWNS (the shelf heading in `sections.tsx`, the `ContactDoors` door,
`/book/cuts` chrome, the /store group title) are flagged, not edited.
Does NOT touch `.env.local`, :3000/:4100 (the operator's live processes),
the main checkout, or any deployment. Dev server on :3128 only, killed by
recorded PID.
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge
to main, never push. ENGLISH-PIN. No new dependencies. BFT dating in
comments. Love design laws: no serif faces, contrast ≥ 4.5:1, no color-only
meaning. Module law: no cross-app imports.

Files this lane touches (the spec's OWNS list, nothing else):
- `WORK-CLAIM.md` (this claim)
- `src/app/support/page.tsx` — the MORE_DOORS entry (~line 22) ONLY
- `src/app/services/page.tsx` — hair-only sections out, hair copy scrubbed
- `src/app/about/page.tsx` — the Silent Hair Sessions lines + the cuts button ONLY
- `src/app/contact/page.tsx` — the "Silent Hair Cut" FAQ entry ONLY
- `src/lib/booking.ts` — the retired flag, the listing filter, the resolver
- `tests/booking-services.test.ts` (new) — the vitest pins

Brief: `~/dev/kimi/inbox/TASK-128-oc-retire-haircut-service.md` (cut 0018.06.16 a₿)
Gates: `npx vitest run` ≥ 36 · `node scripts/calendar-view.test.mjs &&
node scripts/cartridge-identity.test.mjs && node scripts/square-payments.test.mjs`
· `npm run lint` = 0 · `npx tsc --noEmit` · `npx next build` · shots of
/services and /support in dark + dawn (own dev server on :3128, stopped by
PID after; harness borrowed from outbox/task-126, lives in the outbox, not
the repo) → `~/dev/kimi/outbox/task-128/shots/` · SUMMARY.md in
`~/dev/kimi/outbox/task-128/`
Questions → Number One.
