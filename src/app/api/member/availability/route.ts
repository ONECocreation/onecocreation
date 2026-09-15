import { validateHandle, isAvailable, getEntry, reservedSeat } from "@/lib/registry";
import { spaceForHost } from "@/lib/identity-config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("handle") ?? "";
  // The registration page says which space it issues from; host is the fallback
  const space = searchParams.get("space") ?? spaceForHost(request.headers.get("host")).space;

  const valid = validateHandle(raw);
  if (!valid.ok) {
    // TASK-260: claim validation is UNCHANGED — a reserved name still
    // cannot be claimed through this shape check. But a reserved name
    // that already has a real seat (the operator's own account, placed
    // outside the public queue) is a publicly-known fact the same way an
    // ordinary claimed handle's npub already is below — the Stage gallery
    // needs it to draw a real face instead of a guessed one. No seat →
    // falls through to the original unavailable answer, unchanged.
    if (valid.reason === "reserved name") {
      const seat = await reservedSeat(raw, space);
      if (seat) {
        return Response.json({ handle: seat.handle, space, available: false, reason: "reserved", npub: seat.npub });
      }
    }
    return Response.json({ handle: raw, available: false, reason: valid.reason });
  }

  const available = await isAvailable(valid.handle, space);
  if (available) {
    return Response.json({ handle: valid.handle, space, available: true, reason: null });
  }

  // The bound pubkey is public (nostr.json serves it) — returning it lets the
  // page offer "already yours?" recognition for the tag's owner.
  const entry = await getEntry(valid.handle, space);
  return Response.json({
    handle: valid.handle,
    space,
    available: false,
    reason: "already claimed",
    npub: entry?.npub ?? null,
  });
}
