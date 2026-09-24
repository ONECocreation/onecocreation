import { tierFor, tierSatisfies, isTier, normalizeNpub, TIERS, type Tier } from "./entitlement";
import { memberGroup } from "./member-links";
import { getEntry } from "./registry";

/** The top of the ladder, derived from the one ranking (tierSatisfies) —
 *  once a door holds it, no other door can outrank it. */
const TOP_TIER: Tier = (Object.keys(TIERS) as Tier[]).reduce((a, b) => (tierSatisfies(a, b) ? a : b));

/**
 * The ONE answer to "what package does this soul hold?" — walks the member's
 * linked group (email + key doors of the same person), resolves each subject
 * to its grant key (registry npub for tag holders, the subject string for
 * email members) and returns the HIGHEST live tier across the group. Used by
 * the matrix login rail, the rooms shelf and room pages, the class
 * materials, the Stage 2 / Playground door, the home and /style role lines —
 * one lookup, no drift. (The operator's revoke reads a door's OWN grant, not
 * this: see api/admin/matrix/ceremony.)
 *
 * T-452 (block 968,393, the Admiral): it used to return the FIRST live tier
 * found, so a member with two linked sign-ins could be judged by the lower
 * one — an Evening Star member refused at an Evening Star door. Linking
 * already shared a door's tier with the whole group (a door with no tier of
 * its own took a linked door's), so taking the highest opens no new way in:
 * it only stops a lower tier from hiding a higher one.
 *
 * Failure is a LOWER BOUND, never a guess: a door whose lookup throws is
 * skipped and the highest tier actually read stands (never less than the
 * first-found rule gave, never a tier that wasn't read live). Only when no
 * door yielded a tier AND a lookup failed does the error rise — the callers
 * fail closed on it (e.g. /api/stage2's 503). A stored value that isn't a
 * real tier never ranks.
 */
export async function tierForSubject(subject: string): Promise<Tier | null> {
  let best: Tier | null = null;
  let failure: unknown = null;
  for (const s of await memberGroup(subject)) {
    try {
      const at = s.lastIndexOf("@");
      const [h, sp] = at > 0 ? [s.slice(0, at), s.slice(at + 1)] : [s, ""];
      const entry = sp && sp !== "email" ? await getEntry(h, sp) : null;
      const hex = normalizeNpub(entry?.npub);
      const tier = (hex ? await tierFor(hex) : null) ?? (await tierFor(s));
      if (isTier(tier) && !tierSatisfies(best, tier)) best = tier;
    } catch (err) {
      failure ??= err;
      continue;
    }
    if (best === TOP_TIER) break;
  }
  if (best === null && failure !== null) throw failure;
  return best;
}

/** The member's letter address, if any door of theirs is an email. */
export async function emailForSubject(subject: string): Promise<string | null> {
  for (const s of await memberGroup(subject)) {
    if (s.endsWith("@email")) return s.slice(0, -"@email".length);
  }
  return null;
}
