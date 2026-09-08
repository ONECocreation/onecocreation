/**
 * The rooms are for signed-in souls (the Admiral, 0018.06.17 a₿: "I was able
 * to join the weekly reading even when not signed in — that should go to the
 * sign-in area first. Only signed-in users can go to the classes.")
 *
 * One pure decision the middleware asks on every /rooms/* and /live request:
 * no session cookie → the sign-in door with `?next=` back to the room (the
 * T-156 same-origin next-path rule). The cookie's PRESENCE opens the door;
 * the room page and the chat still verify the session itself (a forged
 * cookie meets the real lock there). The /classes shelf stays public — it
 * is how a visitor learns what the rooms are and buys the key.
 */
export const ROOMS_DOOR_PREFIXES = ["/rooms/", "/live"] as const;

export function roomsDoorRedirect(pathname: string, hasSession: boolean): string | null {
  const guarded = pathname.startsWith("/rooms/") || pathname === "/live" || pathname.startsWith("/live/");
  if (!guarded || hasSession) return null;
  return `/login?next=${encodeURIComponent(pathname)}`;
}
