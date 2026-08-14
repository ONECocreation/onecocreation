import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * The media rail (Studio UI batch, 2026-08-13): images upload INTO GIT —
 * versioned, sovereign, "saved to the correct place in the github" — and
 * serve instantly via raw.githubusercontent URLs (no redeploy wait).
 *
 * Repo: GITHUB_ASSETS_REPO (default PacsArcade/onecocreation-assets, public
 * so raw URLs serve without auth). Auth: GITHUB_TOKEN (fine-grained PAT,
 * Contents read/write on that one repo — Vercel env, Sensitive).
 * Path convention: uploads/<epoch>-<safe-name>.<ext>.
 */

const REPO = process.env.GITHUB_ASSETS_REPO?.trim() || "PacsArcade/onecocreation-assets";
const BRANCH = process.env.GITHUB_ASSETS_BRANCH?.trim() || "main";
const DIR = "uploads";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel body ceiling headroom
const OK_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/* Same bare Upstash-REST kv() helper as brand-palette.ts (house pattern:
   each lib/route carries its own). The token can be pasted straight into
   the studio (PUT below) — no Vercel dashboard trip needed; env var still
   wins if the Admiral sets one. Never echoed back to any client. */
const TOKEN_KEY = "media:github-token:onecocreation";

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`media: KV ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

async function token(): Promise<string | null> {
  const env = process.env.GITHUB_TOKEN?.trim();
  if (env) return env;
  try {
    const saved = (await kv(["GET", TOKEN_KEY])) as string | null;
    return saved?.trim() || null;
  } catch {
    return null;
  }
}

function gate(request: Request): NextResponse | null {
  if (!operatorFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}

function rawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;
}

async function gh(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** GET — the library: {ready, items:[{name,url,size}]} newest first. */
export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!(await token())) return NextResponse.json({ ok: true, ready: false, items: [] });
  const res = await gh(`contents/${DIR}?ref=${BRANCH}`);
  if (res.status === 404) return NextResponse.json({ ok: true, ready: true, items: [] });
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: `github ${res.status}` }, { status: 502 });
  }
  const list = (await res.json()) as { name: string; path: string; size: number; type: string }[];
  const items = list
    .filter((f) => f.type === "file")
    .sort((a, b) => (a.name < b.name ? 1 : -1))
    .map((f) => ({ name: f.name, url: rawUrl(f.path), size: f.size }));
  return NextResponse.json({ ok: true, ready: true, items });
}

/** POST { name, mime, dataBase64 } — commit the image, return its raw URL. */
export async function POST(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  if (!(await token())) {
    return NextResponse.json(
      { ok: false, reason: "The library isn't connected yet — open it and paste a GitHub token to connect." },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as
    | { name?: string; mime?: string; dataBase64?: string }
    | null;
  const mime = body?.mime ?? "";
  const ext = OK_MIME[mime];
  if (!ext) {
    return NextResponse.json({ ok: false, reason: "images only (png, jpg, webp, gif, svg)" }, { status: 400 });
  }
  const data = body?.dataBase64 ?? "";
  if (!data || data.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "image too large — keep it under 4 MB" }, { status: 400 });
  }
  const safe = (body?.name ?? "image")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "image";
  const path = `${DIR}/${Date.now()}-${safe}.${ext}`;
  const res = await gh(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `studio upload: ${safe}.${ext}`,
      content: data,
      branch: BRANCH,
    }),
  });
  if (!res.ok) {
    const detail = ((await res.json().catch(() => null)) as { message?: string })?.message ?? "";
    return NextResponse.json(
      { ok: false, reason: `github refused the upload (${res.status} ${detail})`.trim() },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, url: rawUrl(path), name: `${safe}.${ext}` });
}

/** PUT { token } — connect the library: verify against the assets repo, save to KV. */
export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const t = body?.token?.trim() ?? "";
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,255}$/.test(t)) {
    return NextResponse.json(
      { ok: false, reason: "that doesn't look like a GitHub token (fine-grained tokens start with github_pat_)" },
      { status: 400 },
    );
  }
  // live check BEFORE saving: can this token see the assets repo?
  const probe = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: {
      Authorization: `Bearer ${t}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!probe.ok) {
    return NextResponse.json(
      { ok: false, reason: `GitHub refused it (${probe.status}) — check the token's repo access includes ${REPO}` },
      { status: 400 },
    );
  }
  if (!restEnv()) {
    return NextResponse.json({ ok: false, reason: "KV isn't configured on this deployment" }, { status: 503 });
  }
  await kv(["SET", TOKEN_KEY, t]);
  return NextResponse.json({ ok: true });
}

/** DELETE — disconnect the library (forgets the saved token). */
export async function DELETE(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  await kv(["DEL", TOKEN_KEY]);
  return NextResponse.json({ ok: true });
}
