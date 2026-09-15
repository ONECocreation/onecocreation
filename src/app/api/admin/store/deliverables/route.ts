import { NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import { head } from "@vercel/blob";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { listItems } from "@/lib/store";
import { blobStoreEnabled } from "@/lib/registry";

export const dynamic = "force-dynamic";

/**
 * TASK-291 (0018.06.25 a₿ · block 967,144) — "need to ensure that all of
 * meditation items have a digital download. i would like to see a test of
 * each of these items." (the Admiral, 0018.06.25). The check, server-side,
 * operator-gated: for every catalog item that carries — or by its kind
 * should carry — a paid deliverable, answer whether the file really
 * answers. NEVER returns `blobPath` (THE LEAK RULE, store.ts:57) — this
 * route reports hasDeliverable/blobAnswers only, the same shape a buyer's
 * receipt already reasons about, never the pointer itself.
 *
 * blobAnswers:
 *  - null   → no deliverable to check (hasDeliverable false)
 *  - true   → the file answers: a blob HEAD 200 (prod) or the dev file
 *             exists on disk (data/deliverables/<name>)
 *  - false  → the deliverable is recorded but the file doesn't answer: a
 *             blob 404/error, the dev file missing, or a store/deliverables/
 *             pathname on a ship with no blob store configured (honestly
 *             false — never a guess)
 */

/** The client screen is a courtesy; this check is the gate. */
function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  return null;
}

/** Mirrors the download route's own driver split (src/app/api/store/download/[orderId]/route.ts):
    a `store/deliverables/` pathname is a Vercel Blob; anything else is the
    dev driver's `data/deliverables/<basename>` (basename only — no traversal, ever). */
async function blobAnswers(blobPath: string): Promise<boolean> {
  if (blobPath.startsWith("store/deliverables/")) {
    if (!blobStoreEnabled()) return false;
    try {
      await head(blobPath);
      return true;
    } catch {
      return false;
    }
  }
  const name = path.basename(blobPath);
  return existsSync(path.join(process.cwd(), "data", "deliverables", name));
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;

  const items = await listItems({ includeHidden: true });
  const checks = await Promise.all(
    items
      .filter((item) => item.kind === "digital" || Boolean(item.media?.deliverable))
      .map(async (item) => {
        const d = item.media?.deliverable;
        const hasDeliverable = Boolean(d?.blobPath);
        return {
          id: item.id,
          title: item.title,
          kind: item.kind,
          hasDeliverable,
          label: d?.label ?? null,
          blobAnswers: hasDeliverable ? await blobAnswers(d!.blobPath!) : null,
        };
      })
  );

  return NextResponse.json({ ok: true, items: checks });
}
