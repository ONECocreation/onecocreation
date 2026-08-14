import { tierFor, normalizeNpub, type Tier } from "./entitlement";
import { memberGroup } from "./member-links";
import { getEntry } from "./registry";

/**
 * The ONE answer to "what package does this soul hold?" — walks the member's
 * linked group (email + key doors of the same person), resolves each subject
 * to its grant key (registry npub for tag holders, the subject string for
 * email members) and returns the first live tier. Used by the matrix login
 * rail, the rooms shelf, and the /me role card — one lookup, no drift.
 */
export async function tierForSubject(subject: string): Promise<Tier | null> {
  for (const s of await memberGroup(subject)) {
    const at = s.lastIndexOf("@");
    const [h, sp] = at > 0 ? [s.slice(0, at), s.slice(at + 1)] : [s, ""];
    const entry = sp && sp !== "email" ? await getEntry(h, sp) : null;
    const hex = normalizeNpub(entry?.npub);
    const tier = (hex ? await tierFor(hex) : null) ?? (await tierFor(s));
    if (tier) return tier;
  }
  return null;
}

/** The member's letter address, if any door of theirs is an email. */
export async function emailForSubject(subject: string): Promise<string | null> {
  for (const s of await memberGroup(subject)) {
    if (s.endsWith("@email")) return s.slice(0, -"@email".length);
  }
  return null;
}
