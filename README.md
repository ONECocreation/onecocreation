# frens.earth — claim your player tag

Standalone registration site for the **@frens** space: free, sovereign Bitcoin
handles (`alice@frens`) with instant [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)
nostr verification (`alice@frens.earth`), anchored on-chain in batches via the
[Spaces protocol](https://spacesprotocol.org). A project of the
[Pac's Arcade](https://pacsarcade.org) non-profit.

## Instant start — copy, paste, play

```bash
git clone https://github.com/PacsArcade/frens.earth frens.hip
cd frens.hip
npm install
npm run dev
```

That's the whole install. First run writes your `.env.local` (with a fresh
session secret, so sign-in just works) and opens a clean local registry. Then:

1. open http://localhost:3000 and **claim a tag** — forge keys right in the
   browser if you don't have any;
2. hit **PLAY** — [Bitcoin Buddy](http://localhost:3000/bb) is already wired;
3. start building — the operator console lives at `/a` (set `OPERATOR_NPUBS`
   in `.env.local` to your npub to open it), tickets at `/support`.

## How it works

1. **PICK YOUR TAG** — live availability check against the registry.
2. **GET YOUR KEYS** — NIP-07 extension, paste an `npub`, or forge a fresh
   keypair *in the browser* (guided key ceremony; the secret key never touches
   the server — it's copied, then revealed for a double-check, never stored).
3. **LOCK IT IN** — tag + public key enter the claim queue. NIP-05 verification
   works immediately; the next batch ceremony commits a Merkle root of all
   queued tags to Bitcoin in one transaction.

## Stack

- Next.js 16 (App Router, Turbopack) + Tailwind 4, deployed on Vercel
- Registry storage: **Vercel Blob** in production — one immutable blob per
  claim (`registry/<space>/<handle>.json`); `allowOverwrite: false` makes the
  pathname itself the atomic uniqueness check. Local dev uses a JSON file and
  `predev` clears it, so test claims can never ride into a real batch.
- `nostr-tools` for key generation/encoding (the only crypto dependency)

## Run it

```bash
npm install
npm run dev        # local file registry, cleared on every start
```

Production needs two secrets: `BLOB_READ_WRITE_TOKEN` (a Vercel Blob store
connected to the project — the registry) and `SEAT_SECRET` (any long random
string; it signs the sign-in cookie — without it, returning login, tag
release, and the admin side all 500). Set `OPERATOR_NPUBS` too if you want
the operator console (`OPERATOR_EMAILS` adds an email seat — an operator
in through her ordinary email sign-in), and `GITHUB_TOKEN` (fine-grained PAT: contents +
pull-requests write) if the SCAR merge queue should execute merges. No
database, no user accounts — see [`.env.example`](.env.example) for the
full list.

## Environment variables — the full truth

[`.env.example`](.env.example) is the commented, grouped reference and is
kept complete: every var below is real (each is read in `src/` or
`packages/` — verified by census, cut 0018.06.10 a₿), nothing there is
decorative. The groups:

- **Space config** — `NEXT_PUBLIC_SPACE_NAME`, `NEXT_PUBLIC_NIP05_DOMAIN`
- **Registry storage** — `BLOB_READ_WRITE_TOKEN` (file driver locally),
  `REGISTRY_DRIVER`
- **Sessions & the operator console** — `SEAT_SECRET`, `OPERATOR_NPUBS`,
  `OPERATOR_EMAILS`
- **Tenant namespacing** — `TENANT` (default `onecocreation`; one constant
  behind the tenant-scoped KV keys — brand palette, media token, presence
  room — so a second tenant gets its own keyspace; the puck page store has
  its own `PUCK_STORE_NAMESPACE`)
- **The studio copilot (Number One)** — `ANTHROPIC_API_KEY` (full
  ~108-char `sk-ant-` key) or the sovereign local agent `OLLAMA_URL` +
  `OLLAMA_MODEL` (default `llama3.1`). **Precedence: `OLLAMA_URL` wins when
  both are set** — `generatePage` routes to the local agent first
  (`src/lib/copilot.ts`), so a local run never spends Anthropic credits
- **Presence (studio multiplayer)** — `PRESENCE_SECRET` (falls back to
  `SEAT_SECRET`), `PRESENCE_RELAYS`
- **Outbound mail** — `SMTP_HOST`, `SMTP_PORT`, per-persona
  `SMTP_USER_*`/`SMTP_PASS_*`/`MAIL_FROM_*` (personas: `BOOKINGS`, `NEWS`),
  `MAIL_HOURLY_CAP`, `CRON_SECRET`, `CONTACT_INBOX`, `OFFER_NOTIFY_EMAIL`
- **The studio's page store** — `PUCK_STORE_DRIVER`, `PUCK_STORE_FS_DIR`,
  `PUCK_STORE_NAMESPACE`
- **The private KV / order vault** — `KV_REST_API_URL`,
  `KV_REST_API_TOKEN` (Upstash REST), or `REDIS_URL` (socket driver)
- **Media rail** — `GITHUB_ASSETS_REPO`, `GITHUB_ASSETS_BRANCH` (auth via
  `GITHUB_TOKEN` or a studio-pasted token)
- **Matrix bridge** — `MATRIX_HOMESERVER`, `MATRIX_BOT_TOKEN` (or
  `MATRIX_OCC_ADMIN_TOKEN`), `MATRIX_OCC_JWT_SECRET`
- **Node links** (stored `/a` console config wins; env is the bootstrap
  fallback) — `SPACES_NODE_URL`/`SPACES_NODE_TOKEN`,
  `MUD_NODE_URL`/`MUD_ADMIN_TOKEN`, `MEMPOOL_NODE_URL`, `CHAT_NODE_URL`,
  `POKE_NODE_URL`/`NEXT_PUBLIC_POKE_NODE_URL`
- **Briefs sync** — `BRIEFS_REPO`, `BRIEFS_BRANCH`, `BRIEFS_TOKEN`,
  `SHARED_BRIEFS_REPO`, `SHARED_BRIEFS_BRANCH`
- **Money rails** — BTCPay (`BTCPAY_URL`, `BTCPAY_STORE_ID`,
  `BTCPAY_API_KEY`, `BTCPAY_WEBHOOK_SECRET`) and Square
  (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT`,
  `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_URL`)
- **Print/fulfilment** — `PRINTFUL_API_KEY`, `FOURTHWALL_API_TOKEN` (or
  `FOURTHWALL_API_KEY`)
- **Artist roster bootstrap** — `ARTIST_NPUBS`
- **House chrome** — `NEXT_PUBLIC_CONSOLE_CHROME`, `NEXT_PUBLIC_NODE_NAME`,
  `BOOKING_ORGANIZER_EMAIL`, `NEXT_PUBLIC_SITE_URL`
- **The design bench (local only)** — `STUDIO_BENCH`,
  `NEXT_PUBLIC_BENCH_CARTRIDGE`
- **Platform-injected (never hand-set)** — `VERCEL`,
  `VERCEL_PROJECT_PRODUCTION_URL`, `NEXT_PUBLIC_BUILD_AT` (stamped by
  `next.config.ts` at build time)

Two deploy lessons, learned the hard way: **env vars only apply to builds
made after they exist** (set one → redeploy), and this project **deploys by
CLI push** (`npx vercel deploy --prod`), not on git merge. Operators
configure their node links (spaced, MUD) from the `/a` console — stored
config wins, env is the bootstrap fallback.

## Fork this for your own space

This repo is a template: one deployment = one space, and the space is pure
configuration. Your `.env.local` already exists (first `npm run dev` wrote it);
change two values in it — or set the same vars in your Vercel project:

```
NEXT_PUBLIC_SPACE_NAME=yourspace          # tag = name@yourspace
NEXT_PUBLIC_NIP05_DOMAIN=yourspace.example # domain serving this site
```

Then:

1. Create a Vercel project + Blob store for it
   (`vercel blob create-store <name> --access public --yes`), and set
   `BLOB_READ_WRITE_TOKEN` + `SEAT_SECRET` (and `OPERATOR_NPUBS` for `/admin`).
2. Point your domain at the project. NIP-05 requires the domain in
   `NEXT_PUBLIC_NIP05_DOMAIN` to be the one serving `/.well-known/nostr.json`.
3. Reserved names live in `src/lib/registry.ts` (`RESERVED`) — review them for
   your community.
4. **Rebrand.** The registry / claim / NIP-05 core is config-driven, but the
   visible copy is not yet fully themeable. Until it lands, hand-edit the
   Pac's Arcade branding in the hero + cards
   (`src/components/RegistrationPage.tsx`), the claim ceremony
   (`src/components/TagClaim.tsx`), header nav + footer (`ArcadeHeader.tsx`,
   `EarthFooter.tsx`), the profile (`FrenProfile.tsx`), page metadata
   (`src/app/layout.tsx`, `page.tsx`), and the brand theme
   (`src/lib/brand/themes/`). If you own only one space, you can also trim the
   multi-space host map in `src/lib/identity-config.ts` to your own domain.

## Registry data

Each claim is stored as JSON: `{ handle, npub, status: "queued" | "committed",
batchId, requestedAt }`. A claimed tag is `queued` and verifies over NIP-05
immediately.

> **Status:** the Spaces-protocol batch ceremony — computing the Merkle root,
> committing it to Bitcoin with the space-owner wallet, and flipping entries to
> `committed` with an inclusion proof — is **not yet built**. Tags stay
> `queued` (and fully usable on nostr) until that tooling lands; the
> `committed` / `batchId` fields are reserved for it.
