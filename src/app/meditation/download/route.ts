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
 * gift honest — the route resolves the live file on every call. A missing
 * file answers an honest 404 (the ShelfSection truth: no file, no gift).
 */
export async function GET() {
  const filePath = path.join(process.cwd(), "public", "audio", "unzip-into-the-new-you.mp3");
  try {
    const stat = await fs.stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(stat.size),
        "Content-Disposition": 'attachment; filename="unzip-into-the-new-you.mp3"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, reason: "the meditation file is not on this ship" },
      { status: 404 },
    );
  }
}
