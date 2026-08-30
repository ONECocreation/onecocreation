import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { blobStoreEnabled } from "@/lib/registry";

export const dynamic = "force-dynamic";

/**
 * Materials shelf upload — the SAME mechanism as
 * /api/admin/store/upload-deliverable (the smallest honest path the
 * brief asked for): recordings/pdfs/files can blow past Vercel's route-
 * body cap, so prod uploads go browser → blob directly and this route
 * only mints the short-lived client token, operator-gated inside
 * onBeforeGenerateToken. The blob lands under `classroom/materials/`
 * with a random suffix — an unguessable pathname, same shape as a paid
 * store deliverable (class-materials.ts's storage-decision header).
 *
 * Dev fallback: a plain multipart POST written under
 * public/classroom-uploads/ (gitignored) — the prod blob url is also an
 * ungated-once-known unguessable pathname (the tier check happens once,
 * at GET /api/rooms/[slug]/materials, not on every fetch of the file
 * itself), so the dev driver matches that same standard rather than the
 * deliverable route's un-servable data/ dir.
 */

const MATERIAL_TYPES = [
  "audio/*",
  "video/*",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
];

/** 1 GB — same honest ceiling the store's deliverable upload states. */
const MAX_MATERIAL_BYTES = 1024 * 1024 * 1024;

function typeAllowed(mime: string): boolean {
  if (!mime) return false;
  const family = mime.split("/")[0];
  return MATERIAL_TYPES.includes(mime) || MATERIAL_TYPES.includes(`${family}/*`);
}

function safeFileName(name: string): string {
  const ext = (name.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();
  const base = name
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/i, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "material"}${ext}`;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const operator = operatorFromCookieHeader(request.headers.get("cookie"));
    if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
    if (blobStoreEnabled()) {
      return NextResponse.json(
        { ok: false, reason: "blob store is live — materials upload browser → blob directly, not through this body" },
        { status: 400 },
      );
    }
    let file: unknown;
    try {
      file = (await request.formData()).get("file");
    } catch {
      return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, reason: "a file field named 'file'" }, { status: 400 });
    }
    if (!typeAllowed(file.type)) {
      return NextResponse.json(
        { ok: false, reason: "materials are audio, video, pdf, or zip" },
        { status: 415 },
      );
    }
    if (file.size === 0 || file.size > MAX_MATERIAL_BYTES) {
      return NextResponse.json({ ok: false, reason: "a non-empty file up to 1 GB" }, { status: 413 });
    }
    const name = `${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`;
    const dir = path.join(process.cwd(), "public", "classroom-uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, url: `/classroom-uploads/${name}`, size: file.size });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const operator = operatorFromCookieHeader(request.headers.get("cookie"));
        if (!operator) throw new Error("operator session required");
        if (!pathname.startsWith("classroom/materials/")) {
          throw new Error("materials live under classroom/materials/");
        }
        return {
          allowedContentTypes: MATERIAL_TYPES,
          maximumSizeInBytes: MAX_MATERIAL_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // nothing to write here — the operator's browser saves the
        // resulting url onto a MaterialItem via POST /api/admin/classroom/materials
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload token refused" },
      { status: 400 },
    );
  }
}
