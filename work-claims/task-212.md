# work-claim — task-212 (the welcome page)

Lane: home crew (sonnet), one-shot. Base = onecocreation main @ **73278139a127e6edfd4f78790ab9214ac80c22db**
(`7327813`, T-211's follow-through — worktree cut point, matches the GO header). Branch
`feat/task-212-welcome-page`.

Baseline gate (established at cut, before any change): `npx vitest run` → **671/671, 62 files**.

## OWNS (re-grepped at cut, per T210-216-GROUNDING.md §T-212)
- `src/app/welcome/page.tsx`, `src/components/welcome/WelcomeFlow.tsx` — the walking shine (item 2), the
  card border (item 3), Love's picture slot (item 4)
- sign-in copy: `src/components/door/door-machine.ts` (`DOOR_COPY`, `DOOR_KEY_NOTE`/`DOOR_KEY_CTA`),
  `src/components/door/DoorSheet.tsx` — item 6, the nostr-key line (found ALREADY LANDED from T-185;
  verified + pinned by a new test, no code change needed — see Findings)
- `src/components/me/ConstellationCard.tsx`, `src/components/me/EmailMemberPanel.tsx`,
  `src/app/api/member/profile/route.ts` (`ProfileDoc`, read-only — the PUT/GET shape already carries
  `displayName`) — item 5, the preferred name in the constellation
- first-login routing: `door-machine.ts` (`landingFor`), `DoorSheet.tsx`, `src/lib/next-path.ts`,
  `src/app/api/auth/email/verify/route.ts` — item 7 (found ALREADY LANDED from T-185; verified, no
  code change needed — see Findings)
- tests: new `tests/welcome-shine.test.ts` (or similar, named at build time)

## Findings (verify-first, per belief-vs-knowledge)
- **Item 1 (three doors, no flip)** is ALREADY LANDED — T-211 converged the door copy to "Step into
  The Heart Field"; `tests/door-machine.test.ts`'s "ruling 1" describe block already pins the three
  door strings and the retirement of the join/code/names steps. No code change; folded into this
  lane's gate (already counted in the 671 baseline).
- **Item 7 (first-login routing)** is ALREADY LANDED — `landingFor()` sends a brand-new soul (an
  actual account-creation `isNew`, not a per-session flag) to `/welcome` once, at the moment their
  name is claimed (`DoorSheet.tsx`'s `isNew.current`); a returning soul's later logins never see
  `isNew: true` again, so they get the sheet's normal stay-put / `/me` landing. This already IS the
  "one flag on the member record" the brief asks about — the isNew answer is the account's own
  no-profile-yet state, not a second field to invent. Verified, no code change.
- **Item 6 (nostr-key line)** is ALREADY LANDED — `DoorSheet.tsx`'s `sign-in` state renders the email
  form AND `DOOR_KEY_NOTE`/`DOOR_KEY_CTA` together, unconditionally, both paths visible at once
  ("Have a key? One tap to sign…" / the email field above it) — no jargon wall, Love's register.
  Verified, pinned by a new source test, no code change.

## Build (real work this lane does)
1. **The walking shine (item 2)**: WelcomeFlow's three doors get `className="card shine-hover"` +
   a JS-cycled `shine-walk` class (one door lit at a time, ~2.6s dwell) — REUSES the fleet's own
   `.shine-hover::before` / `@keyframes shine-spin` (house.css, unedited) via one scoped `<style>` rule
   local to WelcomeFlow.tsx that triggers the same animation off a class instead of `:hover` (the
   precedent for a component-local `<style>` tag: PopupHost.tsx, PuckEditor.tsx, sections.tsx).
   `prefers-reduced-motion` holds all three at the static `.shine-hover:hover`-equivalent opacity,
   no motion, no interval started.
2. **The card border (item 3)**: the door tiles drop their bespoke `border`/`borderRadius` and take
   `className="card"` instead — the exact rule `/book`'s `ServiceCard.tsx` cards use (`.card` in
   house.css: `1px solid var(--glass-edge)`, `border-radius:24px`), imported not re-spelled.
3. **Love's picture slot (item 4)**: a small round frame above the greeting — a nullable
   `WELCOME_PHOTO_URL` slot (the WildDoors.tsx `INSTAGRAM_DESCRIPTION` precedent), `null` until Love's
   photo lands; until then a dashed-border frame with a quiet dove glyph and "Love's photo is on its
   way" — never a stock face.
4. **Preferred name in the constellation (item 5)**: `ConstellationCard` takes an optional
   `refreshKey` prop (dependency array `[refreshKey]`, defaults to mount-once behaviour when omitted —
   `MeSwitch.tsx`'s bare `<ConstellationCard />` call is unaffected). `EmailMemberPanel`'s existing
   "what would you like to be called" field (already PUTs `displayName` to the member profile — the
   name the constellation's 🌸 star reads) now bumps a counter on a successful save and passes it as
   `refreshKey`, so the constellation lights the star the moment the name is picked, not after a
   reload. Scope: the EMAIL member path only (`ProfileDoc`/KV `member:profile:<email>` — the exact
   store the grounding names); the key member's kind-0 `display_name` (ProfileEditor.tsx) is a
   different, unrelated identity system and stays untouched.

## NOT owned (flag-and-stop → Seams, untouched)
- `src/app/book/page.tsx`, `src/components/ServiceCard.tsx` — read-only reference for the border rule
  (`.card`, house.css); not edited.
- `src/app/house.css` — NOT touched. The walking shine's trigger class lives in a scoped `<style>` tag
  inside `WelcomeFlow.tsx` (a "use client" component-local style, the house's own PopupHost/PuckEditor/
  sections.tsx precedent) so the shared stylesheet (owned by 215/216 per the Overlaps table) needs no
  edit at all — no seam.
- `src/components/ProfileEditor.tsx` (the key member's kind-0 editor) — named in grounding as adjacent
  context, not touched; the "member profile" field in this brief is the email path's KV record only.

## Derive-or-dash
Love's picture slot ships an honest empty frame (a dashed circle + a dove glyph + "Love's photo is on
its way") — no stock face, no placeholder image asset, `WELCOME_PHOTO_URL = null` until her photo
lands by email.

## Shots
/welcome (three doors, the shine mid-walk, the border, the picture slot), /me constellation name
picker, the sign-in nostr-key line — both themes (dark/dawn), 1440 + 390, against the production
build on a fixture KV (ports 3251/3252), harness adapted from
`~/dev/hermes/archive/task-210/patches/task-210/shots/`.

## Operator runbook
None expected — Love's picture lands by email; the slot ships empty-honest until then.
