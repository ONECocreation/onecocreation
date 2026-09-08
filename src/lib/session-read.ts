/**
 * TASK-177 (0018.06.18 a₿) — THE ONE SESSION READ the site chrome already
 * makes. The header's who-am-I (FrenBadge.tsx) reads the session inline:
 * GET /api/frens/session → { ok, handle, space }, and for an email member a
 * follow-up GET /api/member/profile → the known-by name (displayName ||
 * accountName — Love's ask: the chip says who they ARE, "firefly", never
 * the mailbox). No shared helper module existed — FrenBadge carries the
 * two fetches inline — so this helper wraps THAT SAME read for the BuyPanel
 * (which needs to know the visitor before it asks for an email). FrenBadge
 * itself is outside this lane's OWNS; its adopting this helper is a seam.
 * Client-side only (the session cookie rides the fetch), never cached.
 */
export interface MemberSession {
  handle: string;
  space: string;
  /** the known-by name — who the member IS, never the raw mailbox */
  name: string;
}

export async function readSession(): Promise<MemberSession | null> {
  const r = await fetch("/api/frens/session").catch(() => null);
  const d: { ok?: boolean; handle?: string; space?: string } | null =
    r && r.ok ? await r.json().catch(() => null) : null;
  if (!d?.ok || !d.handle) return null;
  const space = d.space ?? "";
  let name = space === "email" ? d.handle.split("@")[0] : d.handle;
  if (space === "email") {
    const p: { ok?: boolean; displayName?: string; accountName?: string } | null =
      await fetch("/api/member/profile")
        .then((r2) => (r2.ok ? r2.json() : null))
        .catch(() => null);
    const known = p?.displayName || p?.accountName;
    if (p?.ok && known) name = known;
  }
  return { handle: d.handle, space, name };
}
