import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { RECON_ROOT } from "@/lib/shinepages-recon";

export const dynamic = "force-dynamic";

/**
 * /api/recon-img (TASK-105, cut 0018.06.12 a₿) — serves the ShinePages
 * capture's shots/assets to the /studio/reference viewer. READ-ONLY fence,
 * same doctrine as the media rail's gate:
 *
 *   - operator cookie required (same operatorFromCookieHeader pattern as
 *     src/app/api/media/route.ts) — the capture is operator-only material
 *   - allowlisted prefixes only: shots/ and assets/ under docs/shinepages-recon/
 *     (the page copy is markdown, read by the viewer itself, never served here)
 *   - image extensions only (jpg/jpeg/png/webp/gif)
 *   - traversal-proof: the param is decoded REPEATEDLY (a double-encoded
 *     %252e%252e survives one pass), then normalized, then re-checked for
 *     absolute paths, drive letters, and any ".." segment, and the final
 *     resolved path must still sit under the recon root
 *
 * Nothing in this route writes — the reference group is read-only law.
 */

const ROOT = join(process.cwd(), RECON_ROOT);
const PREFIXES = ["shots/", "assets/"];
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const refuse = (status: number) =>
  NextResponse.json({ ok: false }, { status });

/** Fully decode a possibly multiply-encoded param; null on bad encoding. */
function fullyDecode(raw: string): string | null {
  let s = raw;
  for (let i = 0; i < 5; i++) {
    if (!/%[0-9a-fA-F]{2}/.test(s)) break;
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    } catch {
      return null;
    }
  }
  // anything still encoded after the loop is treated as hostile
  return /%[0-9a-fA-F]{2}/.test(s) ? null : s;
}

export async function GET(request: Request) {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) return refuse(401);

  const raw = new URL(request.url).searchParams.get("path") ?? "";
  const decoded = fullyDecode(raw);
  if (!decoded) return refuse(400);

  // backslashes are path separators on some platforms — fold them in BEFORE
  // the traversal check so "..\foo" can't sneak past as a bare filename
  const norm = normalize(decoded).replace(/\\/g, "/");
  if (
    norm.startsWith("/") ||
    /^[a-zA-Z]:\//.test(norm) ||
    norm === ".." ||
    norm.startsWith("../") ||
    norm.includes("/../") ||
    norm.endsWith("/..")
  ) {
    return refuse(403);
  }
  if (!PREFIXES.some((p) => norm.startsWith(p))) return refuse(403);
  const mime = MIME[norm.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime) return refuse(403);

  const abs = join(ROOT, norm);
  if (!abs.startsWith(ROOT + sep)) return refuse(403);

  let data: Buffer;
  try {
    data = await readFile(abs);
  } catch {
    return refuse(404);
  }
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      // the capture is immutable (committed docs), but the route is
      // operator-gated — cache privately, never on a shared edge
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
