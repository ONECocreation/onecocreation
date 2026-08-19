# TRANSPLANT — frens-earth-time

Packed 0018.05.25 a₿ (block 963,084) · from the onecocreation repo · TASK-03 Part 3.

## What this is

The arcade time experience, extracted whole from onecocreation. It was a
template leak — this experience belongs to **frens.earth**, not to Love's
site. Everything here is cargo: copy it into the target repo, re-point the
imports, provide the two dependencies listed below, and the clocks perform.

onecocreation keeps only a plain placeholder clock at `/time` (canonical
BFT date + boxed-star height, live-or-dashes) while Love's own face for
that door is drawn.

## Contents

| file | the face |
|---|---|
| `components/time/orrery/Orrery.tsx` + `orrery-engine.ts` + `orrery.css` | THE ORRERY — every ring a bitcoin period around the 624-ember sun; the hero clock |
| `components/time/HalfWheel.tsx` | the half-wheel — the horizon telling, mobile duty for the orrery |
| `components/time/TimeDoor.tsx` | the time door — gate + experiment section (watch a block land) hosting the converters |
| `components/time/Converters.tsx` | the two converters (Gregorian ↔ BFT), the birthday lane's front door |
| `components/time/StripClock.tsx` + `strip-clock-engine.ts` + `strip-clock.css` | the strip clock — the living strip face with block-age seconds |
| `components/time/FlipClock.tsx` + `flip-clock.css` | the flip-clock digit face (+ the pac-lap badge styles) — the css moved WITH the kit out of onecocreation's globals.css |
| `components/BftClock.tsx` | the ring-fill header clock (FlipClock-based). NOTE: dead code in onecocreation at pack time (no importer) — included as a kit face, rewire or delete at the target |
| `components/BdayChecker.tsx` | the Bitcoin Birthday checker — the "full ceremony" the converters' birthday lane points to (`/bday`) |

## What it needs from `bft.ts`

The kit does NOT carry its own clock math — it imports `@/lib/bb/bft`.
Provide that module at the target with this exact surface (onecocreation's
`src/lib/bb/bft.ts` is a verbatim-faithful TypeScript port of the canonical
package — github.com/PacsArcade/bitcoin-federated-time v0.3.0 (MIT),
`bft/__init__.py` — plus the house calendar layer; port or copy it):

- Calendar core: `bft`, `bftDate`, `bftDatePlain`, `bftTime`, `bftDateTime`,
  `beforeBitcoin`, constants `GENESIS_MS`, `BLOCKS_PER_DAY`
  (`BLOCKS_PER_MONTH` / `BLOCKS_PER_YEAR` ride along).
- Canonical bridge: `fromHeight`, `formatDate`, `heightAt`, `fromGregorian`,
  type `BftKnown`, constant `GENESIS_UNIX_S`.
- Lore: `moonPhase`, `yearAnimal`.
- The anchored estimate model: `estimateHeightAt`, `estimateHeight`,
  `estimatedBlockAtMs`, `CHAIN_ANCHORS`. **The kit's offline behavior
  depends on these** — the arcade's clocks keep counting on the anchored
  model when the network is unreachable, wearing the honest `~`.
- `currentBlockInfo()` + type `BlockInfo` — **the ARCADE flavor**:
  `BlockInfo = { height: number; estimated: boolean; tipTimestamp: number | null }`,
  with the third rung intact (proxy → direct mempool.space read →
  genesis-anchored estimate flagged `estimated: true`).

> ⚠ DIVERGENCE (fleet ruling 0018.05.26 a₿ — "dashes over estimates,
> estimate rungs DELETED not gated"): onecocreation's own `bft.ts` deleted
> the estimate rung and the `estimated` field — on ITS surfaces a
> modeled height never renders. That ruling governs onecocreation, not
> this kit: the arcade's faces are explicitly built on the `~` model (the
> orrery "never stops and never pretends"). At the target, use the
> arcade-flavor `bft.ts` — onecocreation's git history has it immediately
> before the 0018.05.26 rung deletion, or re-port from the canonical
> package. `StripClock`, `BftClock`, `BdayChecker`, and `TimeDoor` all
> consume `estimated` / the estimate API.

## What it needs from the brand cartridge

`orrery-engine.ts` reads `cartridge.doors.timeTipUrl` (from
`@/brand/cartridge`) — the house clock's own time server, CORS open, the
orrery's second ladder rung. A cartridge VALUE, not code: point it at the
target house's time server, or `""` to sail on the target's own seam plus
the honest `~` model alone.

## The door contract

Every live face knocks on the same door shape:

```
GET /api/chain/tip?full=1  →  { ok: true, height: number, tipTimestamp?: number }
```

`tipTimestamp` (unix seconds the tip block was mined, `?full=1`) anchors
the block-age seconds so every clock agrees. Without `?full=1` a bare
`{ ok, height }` answers. The target needs this route (or an equivalent
CORS-open door in `timeTipUrl`).

## Global CSS the kit expects

- `.starbox` (used by `BdayChecker`) — the boxed-★ block-height mark:
  cyan (info), `1.5px` border, `::before` content "★". Copy from
  onecocreation `src/app/house.css` (`.starbox`, and `.ab-mark` for the
  a₿ marker) or re-skin to the target's tokens.
- The kit's own stylesheets ride with it: `strip-clock.css`, `orrery.css`,
  `flip-clock.css` (the `.fclk-*` flip-card + `.bft-pac` pac-lap styles —
  extracted from onecocreation's `globals.css` at pack time; `FlipClock.tsx`
  imports it directly).
- Components are dressed in Tailwind utilities (onecocreation runs
  Tailwind v4) — the target needs Tailwind or a re-skin pass.
- Pixel display type is scoped via an `ArcadeFonts`-style wrapper at the
  route (onecocreation's `/time` layout did this).

## Install notes

1. Copy `components/` into the target's `src/components/` (paths in the
   imports assume `@/components/time/...` — keep the tree or re-point).
2. Provide `@/lib/bb/bft` (arcade flavor, above) and `@/brand/cartridge`
   with `doors.timeTipUrl`.
3. Provide the `/api/chain/tip` door (contract above).
4. Routes the kit references: `/bday` (BdayChecker's home — Converters and
   HalfWheel link to it) and `/time` (StripClock/BftClock link home to it).
5. These files typechecked against onecocreation's pre-ruling `bft.ts` at
   pack time; they are excluded from onecocreation's build/lint as cargo.

## Left behind in onecocreation (not part of the kit)

- `src/lib/bb/bft.ts` — kit core, stays (stamps/clocks across the site
  need it), minus the estimate rung per the ruling.
- `cartridge.doors.timeTipUrl` — stays as brand config (the arcade's door
  URL is a cartridge value; onecocreation's copy points at the arcade).
- `/time` + `/bday` — reduced to honest placeholder pages.
