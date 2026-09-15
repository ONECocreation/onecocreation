/**
 * Identity domain configuration.
 *
 * The registration page is one shareable machine that adapts to the domain
 * serving it: a template deployment's players claim their own @space tag on
 * their own domain — here, One Cocreation's souls claim @onecocreation on
 * onecocreation.com. Add a row here for every space we own. Env vars remain
 * as fallbacks for local dev and one-off deployments.
 */

export interface SpaceConfig {
  space: string;
  nip05Domain: string;
}

// DEHOUSED 0018.05.17 (the eat6 walk found it): Love's clone hosts ONE
// board — hers. The template's other spaces (frens/pacsarcade/degen) were
// leftover residue; leaving them in KNOWN_SPACES let foreign registries
// answer sign-ins on her site. A fleet clone lists only its own doors.
export const SPACE_HOSTS: Record<string, SpaceConfig> = {
  "onecocreation.com": { space: "onecocreation", nip05Domain: "onecocreation.com" },
  "www.onecocreation.com": { space: "onecocreation", nip05Domain: "onecocreation.com" },
};

/** This deployment's own default — the first of its own SPACE_HOSTS rows,
    so an unset env var falls through to OC's own domain/space, never a
    template default. */
const OC_DEFAULT: SpaceConfig = Object.values(SPACE_HOSTS)[0] ?? {
  space: "onecocreation",
  nip05Domain: "onecocreation.com",
};

export const NIP05_DOMAIN =
  process.env.NEXT_PUBLIC_NIP05_DOMAIN ?? OC_DEFAULT.nip05Domain;

export const SPACE_NAME = process.env.NEXT_PUBLIC_SPACE_NAME ?? OC_DEFAULT.space;
export const SPACE_TAG = `@${SPACE_NAME}`;

/**
 * Anchor ceremony ETA in blocks — "seven ate nine", about seven weeks. The
 * one source for the registration success screen and every profile badge:
 * estimated anchor block = current tip + ANCHOR_BLOCKS_OUT.
 */
export const ANCHOR_BLOCKS_OUT = 6789;

/**
 * Every space that may have a claim registry on this deployment: the spaces
 * mapped in SPACE_HOSTS, plus the configured SPACE_NAME. Deriving this (rather
 * than hardcoding a list) is what lets a FORK work — a fork sets
 * NEXT_PUBLIC_SPACE_NAME to its own space, and if that space isn't in this set
 * `findHandleByNpub` never scans it, so returning sign-in silently fails.
 * SPACE_NAME goes first so the host's own space is checked first.
 */
export const KNOWN_SPACES: readonly string[] = Array.from(
  new Set<string>([SPACE_NAME, ...Object.values(SPACE_HOSTS).map((c) => c.space)])
);

export function spaceForHost(host?: string | null): SpaceConfig {
  const h = (host ?? "").toLowerCase().split(":")[0];
  return SPACE_HOSTS[h] ?? { space: SPACE_NAME, nip05Domain: NIP05_DOMAIN };
}

/** The canonical domain for a space — the reverse of SPACE_HOSTS. */
export function domainForSpace(space: string): string {
  for (const cfg of Object.values(SPACE_HOSTS)) {
    if (cfg.space === space) return cfg.nip05Domain;
  }
  return NIP05_DOMAIN;
}

/** What each door is for — the two-door model, config not copy. */
export const SPACE_ROLES: Record<string, string> = {
  onecocreation: "COMMUNITY",
  frens: "PLAY",
  pacsarcade: "SCHOOL",
  degen: "WONDER",
};
