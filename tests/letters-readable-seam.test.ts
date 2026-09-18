import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-332 (0018.06.27 a₿) — the LettersRoom `readable` seam, the follow-on
 * lane T-304's own Seams section named but deferred: a mailbox entry whose
 * `key` doesn't resolve to a real letter template (T-304's own
 * "studio-invite" receipts, for example) rendered in the public reading
 * room as a `<Link href="/letters/studio-invite">` — clicking it 404s
 * (`/letters/[key]/page.tsx:24`, `notFound()` on any key failing
 * `isLetterKey`). This lane has `/api/me/letters` annotate each entry with
 * whether it actually resolves, and `LettersRoom.tsx` render an
 * unresolving row as a plain receipt (no href, "sent" instead of "read")
 * instead of a dead link. Read-the-source pins, house style
 * (tests/console-field-contrast.test.ts) — no network/render harness. The
 * pins:
 *
 *   (a) the route annotates readable via isLetterKey — imported from
 *       @/lib/letters (never reimplemented), mapped onto every
 *       listMailbox() entry, additive (no field removed or renamed);
 *   (b) LettersRoom.tsx renders a readable === false row with no
 *       <Link>/href — a plain <div> instead — and the chip reads "sent",
 *       never "read";
 *   (c) a readable === true / undefined row (the safe-fallback case,
 *       including a stale/uncached response with no field at all) still
 *       renders as a clickable "read" Link.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const ROUTE = "src/app/api/me/letters/route.ts";
const ROOM = "src/components/LettersRoom.tsx";

describe("TASK-332 — the LettersRoom readable seam (unresolving mailbox rows render honestly)", () => {
  it("(a) /api/me/letters annotates each entry with readable, computed by the real isLetterKey", async () => {
    const src = await read(ROUTE);
    expect(src, "isLetterKey must come from @/lib/letters, never reimplemented")
      .toMatch(/import\s*\{\s*isLetterKey\s*\}\s*from\s*"@\/lib\/letters"/);
    expect(src, "listMailbox's own field shape (key/subject/atMs) must still flow through unmodified")
      .toMatch(/\.\.\.l,\s*readable:\s*await isLetterKey\(l\.key\)/);
    // additive only — the original bare `await listMailbox(email)` return
    // is gone, but listMailbox itself is still the data source
    expect(src).toMatch(/await listMailbox\(email\)/);
    expect(src, "email : null fallback (signed-out / no-email state) must stay untouched")
      .toMatch(/const letters = email\s*\n?\s*\?/);
  });

  it("(b) Entry.readable is optional, and a readable === false row renders no Link/href — a plain div reading \"sent\"", async () => {
    const src = await read(ROOM);
    expect(src, "Entry.readable must be optional — a field-less response is still valid Entry shape")
      .toMatch(/interface Entry \{[^}]*readable\?:\s*boolean[^}]*\}/);

    // the row branches on l.readable === false, and the false branch is a
    // <div>, never a <Link> — no href at all in that branch
    expect(src, "the row must branch on l.readable === false").toMatch(/return l\.readable === false \? \(/);
    expect(src, "the readable === false branch must render a plain <div style={rowStyle}> wrapping rowContent")
      .toMatch(/<div key=\{`\$\{l\.key\}-\$\{l\.atMs\}-\$\{i\}`\} style=\{rowStyle\}>\{rowContent\}<\/div>/);

    // the chip text itself must key off readable === false, swapping to "sent"
    expect(src, "the chip must read \"sent\" (not \"read\") when readable === false")
      .toMatch(/\{l\.readable === false \? "sent" : "read"\}/);
  });

  it("(c) a readable === true / undefined row still renders as a clickable \"read\" Link (the safe fallback)", async () => {
    const src = await read(ROOM);
    // the true/undefined branch of the same ternary is the original <Link>
    expect(src, "readable true/undefined must still render a <Link href={/letters/${l.key}}>")
      .toMatch(/<Link key=\{`\$\{l\.key\}-\$\{l\.atMs\}-\$\{i\}`\} href=\{`\/letters\/\$\{l\.key\}`\} style=\{rowStyle\}>\s*\{rowContent\}\s*<\/Link>/);

    // and the ternary that picks "sent" vs "read" defaults to "read" for
    // anything that is not strictly false (true, or the field missing)
    expect(src).toMatch(/l\.readable === false \? "sent" : "read"/);
  });

  it("recentFeed (a different, curated array — not mailbox rows) is untouched", async () => {
    const src = await read(ROOM);
    // recentFeed's own row still wears the unconditional "read" chip and a
    // plain <Link> — no readable branching leaked into it
    const recentBlock = src.match(/const recentFeed = recent\.length > 0[\s\S]*?\n {2}\);/);
    expect(recentBlock, "recentFeed block must still exist, unmodified in shape").not.toBeNull();
    expect(recentBlock![0]).toMatch(/<Link key=\{n\.key\} href=\{`\/letters\/\$\{n\.key\}`\}/);
    expect(recentBlock![0]).not.toMatch(/readable/);
  });
});
