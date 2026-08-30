import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import {
  listMaterials,
  addMaterial,
  removeMaterial,
  attachMaterial,
  materialsConfigured,
  type MaterialAttachment,
  type MaterialKind,
} from "@/lib/class-materials";

export const dynamic = "force-dynamic";

/**
 * The operator's side of the materials shelf (Love's Desk Week/Day
 * altitudes) — list/add/attach/remove, all gated the same way
 * /api/admin/booking is. Members reach their own tier-gated read at
 * /api/rooms/[slug]/materials instead; this route never answers a
 * non-operator caller anything at all.
 */

function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  return null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!materialsConfigured()) {
    return NextResponse.json({ ok: false, reason: "materials vault not configured" }, { status: 503 });
  }
  const roomSlug = new URL(request.url).searchParams.get("room") ?? undefined;
  const items = await listMaterials(roomSlug);
  return NextResponse.json({ ok: true, items });
}

interface AddBody {
  roomSlug?: string;
  name?: string;
  kind?: MaterialKind;
  url?: string;
  attachedTo?: MaterialAttachment;
}

export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, reason: "bad origin" }, { status: 403 });
  if (!materialsConfigured()) {
    return NextResponse.json({ ok: false, reason: "materials vault not configured" }, { status: 503 });
  }
  let body: AddBody;
  try {
    body = (await request.json()) as AddBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  const result = await addMaterial({
    roomSlug: body.roomSlug ?? "",
    name: body.name ?? "",
    kind: body.kind ?? "file",
    url: body.url ?? "",
    attachedTo: body.attachedTo ?? { kind: "shelf" },
  });
  if (!result.ok) return NextResponse.json({ ok: false, reason: `needs ${result.reason}` }, { status: 400 });
  return NextResponse.json({ ok: true, item: result.item });
}

interface AttachBody {
  id?: string;
  attachedTo?: MaterialAttachment;
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, reason: "bad origin" }, { status: 403 });
  if (!materialsConfigured()) {
    return NextResponse.json({ ok: false, reason: "materials vault not configured" }, { status: 503 });
  }
  let body: AttachBody;
  try {
    body = (await request.json()) as AttachBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  if (!body.id || !body.attachedTo) {
    return NextResponse.json({ ok: false, reason: "id + attachedTo required" }, { status: 400 });
  }
  const result = await attachMaterial(body.id, body.attachedTo);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 });
  return NextResponse.json({ ok: true, item: result.item });
}

export async function DELETE(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, reason: "bad origin" }, { status: 403 });
  if (!materialsConfigured()) {
    return NextResponse.json({ ok: false, reason: "materials vault not configured" }, { status: 503 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, reason: "id required" }, { status: 400 });
  const removed = await removeMaterial(id);
  return NextResponse.json({ ok: removed });
}
