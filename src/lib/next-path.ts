/**
 * THE `next` PATH'S SAFETY RULE (TASK-156, 0018.06.17 a₿): the free-reading
 * door carries `?next=/rooms/weekly-reading` through the sign-in card so a
 * new soul lands IN the reading room the moment the code matches. A query
 * param is visitor-controlled, so only same-origin absolute paths pass —
 * protocol-relative //host, full URLs, backslash tricks and empty strings
 * all fall back to null and the caller walks its own default (/me, the
 * welcome path).
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  return raw;
}

/** Reads `next` off the current location. Client-side only by design: the
 *  sign-in success handlers run on user events, never during SSR, so a
 *  window read here has no hydration seam and needs no useSearchParams
 *  suspense boundary. */
export function nextPathFromLocation(loc?: { search: string }): string | null {
  try {
    const search = loc?.search ?? window.location.search;
    return safeNextPath(new URLSearchParams(search).get("next"));
  } catch {
    return null;
  }
}
