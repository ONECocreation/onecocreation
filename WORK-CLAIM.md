# WORK-CLAIM — TASK-97 (studiopac prop-lift + tenant namespacing + env truth)

CLAIMED-BY: **kimi** (Kimi Code CLI, guest builder lane for Pac)
CLAIMED-AT: BFT derive-or-dash — claimed at session start, cut 0018.06.10 a₿ brief
BRANCH: `feat/task-97-prop-lift`
WORKTREE: `~/dev/worktrees/task-97`
BASE: main tip `79b0e57` (main moved past the brief's `799a71f` — same line, one commit on: the T-105 claim retirement)
ROOM: `/studio` PuckEditor dependency inversion, the three hardcoded-tenant KV key sites, and the env docs. Does NOT touch `.env.local`, package.json runtime deps, :3000/prod, or the PagesPanel/mail.ts/package.json files the task-105 lane owns (vitest stays out unless the G3 test truly needs it — judging, will document).
LAW: LANE-CLAIM before building (K5 ruling 1). Commit at gates. Never merge to main, never push, never touch :3000/prod (dev proof on :3197 only, stopped after). ENGLISH-PIN. BFT dating in comments.

Files this lane touches:
- `WORK-CLAIM.md` (this claim)
- `src/components/PuckEditor.tsx` (the four `@/` imports — puck-config, puck-seeds, brand tokens, Copilot — become props)
- `src/components/studio/StudioEditor.tsx` (new — the `"use client"` wiring bridge; the RSC serializer can't carry config's render functions, and server-passed seeds/tokens would bloat the flight payload)
- `src/app/studio/[[...slug]]/page.tsx` (renders the wiring bridge — same slug/data contract)
- `src/lib/tenant.ts` (new — the ONE env-driven tenant constant, default 'onecocreation')
- `src/lib/brand-palette.ts`, `src/app/api/media/route.ts`, `src/app/api/presence/route.ts` (KV keys / HMAC labels namespaced via the tenant constant)
- `scripts/tenant-keys.test.mjs` (new — dependency-free G3 proof: default tenant = byte-identical legacy keys) OR a vitest pinned exactly ^3.2.7 if the plain-node route proves unclean — judging, will document
- `.env.example`, `README.md` (env truth: every real var, incl. ANTHROPIC_API_KEY / OLLAMA_URL / OLLAMA_MODEL with the verified OLLAMA-wins precedence)

Brief: `~/dev/kimi/inbox/TASK-97-studiopac-prop-lift-and-namespacing.md` (cut 0018.06.10 a₿)
Questions → Number One.
