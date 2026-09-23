/* the fixed origin every candidate resolves against — never
   window.location.origin (vitest runs node, no window) and never a
   Host/x-forwarded-host header (welcome/page.tsx is a server component) */
const SENTINEL = "https://next-path.invalid";

/**
 * THE `next` PATH'S SAFETY RULE (TASK-156, 0018.06.17 a₿; hardened TASK-442,
 * 0018.07.05 a₿): `?next=` is visitor-controlled and URLSearchParams decodes
 * it BEFORE any check runs — %09 arrives as a real tab, %5C as a real
 * backslash. The WHATWG parser behind every navigation strips tab/CR/LF
 * outright, treats `\` as `/`, and normalises dot-segments, so `/..//host`
 * becomes protocol-relative `//host`. The rule: anything that isn't a
 * non-empty string (a repeated ?next= reaches the server as an array) falls
 * to null; any C0 control, DEL or backslash anywhere falls to null; the path
 * must start with `/` but not `//`; and it must resolve against the fixed
 * sentinel without changing origin or gaining a `//` pathname. What passes
 * returns BYTE-IDENTICAL — returning u.pathname + search + hash would itself
 * mint `//host` out of `/..//host`. Null sends the caller to its own default
 * (/me, the welcome path).
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  const u = new URL(raw, SENTINEL);
  if (u.origin !== SENTINEL || u.pathname.startsWith("//")) return null;
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
