# Changing a photo on your site — the studio way

A short guide for Love. No code, no developer needed for pages the studio serves.

## The short version

1. Open **/studio** on your site and sign in as the operator.
2. In the pages panel, pick the page you want (or make a new one).
3. Click the block with the picture. In its fields you'll see the image row —
   click **library**.
4. Click **⇪ upload** and choose your photo (or pick one already in the
   library, or paste an image link). iPhone photos work too.
5. Click **Publish** (top bar). Done.

That's it. While you work, the page quietly saves a draft, so nothing is lost
if you close the tab — but visitors only see changes after **Publish**.

## What happens to your photo when you upload

- It's automatically shrunk (nothing wider than 2000px) and converted to
  **webp**, the small fast format — you don't have to prepare anything.
- It's saved straight into your site's picture library (a GitHub assets
  repo) and is live **immediately**. No redeploy, no waiting, no developer.

## About your lake photo (600px wide) — one piece of advice

Put it in an **Image** block and set its **width to about 560–600**. Do not
use it as a **Band background**, and don't turn on **parallax** for it: a
band stretches a small photo across the whole screen, and a 600px photo
pulled that wide goes soft and blurry. As an Image block at its own size it
stays crisp and lovely.

## If the upload button is greyed out

That means the picture library isn't connected yet. Right under the button
there's a **connect box**: paste a GitHub token there and press **connect** —
it's checked live, saved safely on the server, and never shown again. If you
don't have that token, ask your developer; it takes them a minute to make
one. And an honest note: what I can see in the code tells me the studio is
built to work this way, but I can't see your live site's hosting settings
from here — so if connecting doesn't take, or the pages panel says it's
disabled, that's a hosting-setting question for your developer, not something
you did wrong.

## One honest exception (for now)

The photo on **/meditation** is still placed by hand in the site's code
today, so the studio can't swap that one yet — that page switches over once
its studio version is published (your developer can do this quickly). On
every page the studio serves — anything you've published from /studio — the
steps above are exactly how it works, every time.
