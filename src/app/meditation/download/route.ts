import { NextResponse } from "next/server";
import { promises as fs, createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

/**
 * TASK-492 (block 969,094 a₿) — R-077: the free meditation's DOWNLOAD door.
 * The lead-magnet letter's gold button lands here and the 27 MB mp3 saves
 * straight to the reader's device (on Love's walk, [00:06:20], the old link
 * opened a page instead). The gift is free and public, so there is no
 * capability gate — this is the store-download dev-driver idiom
 * (src/app/api/store/download/[orderId]/route.ts) minus the order key:
 * a constant path (no traversal surface), streamed from disk with an
 * attachment disposition. The same file stays at the plain static path
 * /audio/unzip-into-the-new-you.mp3 for the Listen link. Cache-Control:
 * no-store mirrors the precedent and keeps an in-place re-upload of the
 * gift honest — the route resolves the live file on every call.
 *
 * AMENDMENT 1 (block 969,095, the security seat's finding): on Vercel,
 * public/ assets are NOT traced into serverless functions — next.config.ts's
 * outputFileTracingIncludes now forces the mp3 in, AND if the disk read
 * still fails (ENOENT or any stat failure) the route answers a 302 to the
 * static /audio/ path instead of a dead 404. The redirect loses the
 * attachment disposition — the file plays inline rather than saving — but
 * the gift is never dead. Stat-in-try / stream-outside (the slop seat's
 * split): only the stat rides the try, so a stat success always pours.
 */
export async function GET(request: Request) {
  const filePath = path.join(process.cwd(), "public", "audio", "unzip-into-the-new-you.mp3");
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(filePath);
  } catch {
    /* the serverless case (or any stat failure): hand the reader the static
       Listen file instead — inline play, not a save, but never a dead door */
    return NextResponse.redirect(new URL("/audio/unzip-into-the-new-you.mp3", request.url), 302);
  }
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(stat.size),
      "Content-Disposition": 'attachment; filename="unzip-into-the-new-you.mp3"',
      "Cache-Control": "no-store",
    },
  });
}
