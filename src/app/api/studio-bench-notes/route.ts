import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { benchEnabled } from "@/lib/bench-gate";

/**
 * BENCH NOTES (S26 lane 3) — the feedback rail's landing strip. While the
 * Admiral plays with the bench studio, notes from the corner box append
 * here: bench-data/notes.json, a plain JSON array on his own machine. No
 * network, no external service, nothing leaves the box.
 *
 * Belt and suspenders per the auth law: the UI only mounts behind the bench
 * gate, and THIS route re-checks it — gate off means a bare 404 with no
 * body and no hints, exactly as if the route were never built. Node runtime
 * (fs), nothing edge-hostile imported.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTES_DIR = path.join(process.cwd(), "bench-data");
const NOTES_FILE = path.join(NOTES_DIR, "notes.json");
const MAX_NOTE_LENGTH = 2000;

interface BenchNote {
  at: string;
  note: string;
}

async function readNotes(): Promise<BenchNote[]> {
  try {
    const raw = await readFile(NOTES_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BenchNote[]) : [];
  } catch {
    /* missing or unreadable file = an empty rail, not an error */
    return [];
  }
}

export async function POST(request: Request) {
  if (!benchEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const note =
    typeof body === "object" && body !== null && "note" in body
      ? (body as { note: unknown }).note
      : null;
  if (typeof note !== "string" || !note.trim() || note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const notes = await readNotes();
  notes.push({ at: new Date().toISOString(), note: note.trim() });
  await mkdir(NOTES_DIR, { recursive: true });
  await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}
