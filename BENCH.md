# BENCH.md — the studio demo bench

Open the studio on your own machine. No cloud, no KV account, no GitHub
assets repo. Three demo pages and a popup are waiting for you; everything
you save lands in `bench-data/` on disk, and nothing leaves the machine.

## One-time setup (two lines)

The bench signs in through the **real operator gate** — same door as
production, no bypass. First boot already writes a fresh random
`SEAT_SECRET` into `.env.local` for you. Add yourself to the operator list:

```
# .env.local — your machine only, never committed
OPERATOR_NPUBS=npub1<your-npub-here>
SEAT_SECRET=<any long random string — first boot already made one>
```

That's the **key door**: at the gate, click **Verify operator key** and your
browser signer (nos2x, Alby, …) signs a challenge. Fully local — no network,
no inbox, nothing else to set. This is the recommended bench door.

**The email seat also works** — `OPERATOR_EMAILS=you@example.com` — but the
sign-in code travels by email, and email needs the vault and the mail rail.
So for the email door, *additionally* set your real `KV_REST_API_URL` /
`KV_REST_API_TOKEN` and `SMTP_HOST` / `SMTP_USER_BOOKINGS` /
`SMTP_PASS_BOOKINGS`. Then the code arrives in your real inbox exactly like
production. Without them the email door honestly answers
*"email sign-in isn't wired yet"* — that's the site telling the truth, not
a bench bug. Use the key door.

## The one command

```
npm run studio:bench
```

Seeds `bench-data/` **only if it's absent** (your edits survive restarts —
a bench you can lose work on isn't a bench), then starts the dev server with
the filesystem page store and the feedback rail switched on.

```
npm run studio:bench:fresh
```

Wipes `bench-data/` and reseeds from scratch — the explicit reset, for when
you've taken the pages apart and want them back.

## The first walk

1. **http://localhost:3000/studio** → the operator gate → **Verify operator
   key** → your signer signs → you're in, on the seeded `home` page.
2. **pages** (top bar) — the pages panel lists `home`, `memberships`,
   `field-notes`. It works: the filesystem driver means saves actually
   persist. Open `memberships`.
3. **Move a block** — drag one in the canvas or the OUTLINE rail. The draft
   autosaves to `bench-data/` (watch the `draft` chip, top right).
4. **Preview & publish** (gold button, top left) — the draft renders in
   **both themes side by side** (the dual-theme chrome: light on the left,
   dark on the right). If it's honest in both skins, **Publish to live**.
5. **http://localhost:3000/p/home** — the live page, served from
   `bench-data/`. Wait two seconds: the bench popup fires (toggle it from
   **popups** in the studio bar).

## The notes rail

Bottom-left corner of the studio: the little **notes** box. Type a thought,
hit send — it appends to `bench-data/notes.json` on your machine. No
network, no service; it's how you leave feedback while you click around.
The box only exists on the bench (never in a production build).

## Honestly OFF on the bench

- **Media upload** — uploads write into the GitHub assets repo and mint
  tokens through KV. Without `GITHUB_TOKEN` + KV the rail reports
  `ready:false` and the upload button stays dark. Every other image field
  still takes a path or URL by hand.
- **The emailed sign-in code** — see above: needs your real KV + SMTP env,
  or it honestly declines. The key door needs nothing.
- **Number One (the copilot)** — needs `ANTHROPIC_API_KEY`; without it the
  copilot panel says so itself and stays quiet.
- **Checkout / BTCPay** — not wired anywhere yet; the tier cards are for
  poking structure, not sats.

Everything else — pages, popups, drafts, publish, both-theme preview, the
brand board, the notes rail — is the real studio, all the way down.
