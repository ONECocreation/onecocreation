# ONE Cocreation

Love's site — **onecocreation.com**. Intuitive sessions, meditations and
community with Love. Visitors pay in dollars or bitcoin; sats land in One
Cocreation's own node, never held by anyone else.

## What's in here

- **The rooms** — the public site: `/welcome`, `/about`, `/book` (readings
  and sessions), `/retreats`, `/classes`, `/memberships`, `/meditation`,
  `/jewelry`, `/store`, `/packages`, `/gift`, `/letters`, `/news`, `/live`,
  `/meet`, and the member side at `/me`. Each room is a route under
  `src/app/`; shared furniture (header, footer, doors) lives in
  `src/components/`.
- **The store** — catalog, cart and checkout under `/store` + `/cart`,
  with money rails for Square (dollars) and BTCPay (bitcoin), and
  print/fulfilment rails (Printful, Fourthwall) behind the catalog.
- **The studio rails** — the puck page editor at `/studio`, the cartridge
  brand system (`src/brand/cartridge.ts` + `cartridge.css` tokens), the
  page store (`packages/page-store`), and the studio copilot.
- **The desks** — the operator console at `/a` (site, store, money,
  people, bookings, mail, nodes — houseOnly, gated by `OPERATOR_NPUBS` /
  `OPERATOR_EMAILS`) and the designer at `/style` (brand tokens, page
  previews, publish).

## Run it

```bash
npm ci
npm run dev
```

First run writes a `.env.local` (with a fresh session secret) via the
`predev` setup script, so sign-in works locally out of the box. Local dev
uses file-backed storage and needs nothing else.

Production reads its rails from the environment — **names only here,
values never**: the session cookie is signed by `SEAT_SECRET`, the
registry/media rail rides Vercel Blob (`BLOB_READ_WRITE_TOKEN`), and the
private KV / order vault is Upstash REST (`KV_REST_API_URL` /
`KV_REST_API_TOKEN`) or a socket driver (`REDIS_URL`).
[`.env.example`](.env.example) is the commented, grouped, complete
reference — every var in it is real and read in `src/` or `packages/`.

Two deploy lessons, learned the hard way: **env vars only apply to builds
made after they exist** (set one → redeploy), and this project **deploys
by CLI push** (`npx vercel deploy --prod`), not on git merge.

## Test gates

Every change passes all of these before it ships:

```bash
npm test                       # vitest — the tests/ suite
node scripts/<name>.test.mjs   # the script harnesses, run individually
npm run lint                   # eslint — zero warnings
npx tsc --noEmit               # types
npm run build                  # next build
```

## Lineage

Built on the Pac's Arcade template; the template's own README lives at
github.com/PacsArcade/frens.earth.
