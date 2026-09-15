/**
 * The house-seeds switch (T-270, HB-10's recommendation) — whether THIS
 * deployment renders the fleet's own furniture: the officers roster, the
 * ship's log, the cross-project sign-off tickets. Every template clone
 * (ONE Cocreation, every future fork) ships with these EMPTY: the fleet's
 * crew, war stories and open tickets are the house's own business, never a
 * client's console, unless a site config explicitly asks for them — never
 * a rename-in-place. Set NEXT_PUBLIC_HOUSE_SEEDS=1 to opt a deployment in;
 * unset (every clone's honest default) renders nothing rather than someone
 * else's history.
 */
export const HOUSE_SEEDS_ENABLED = process.env.NEXT_PUBLIC_HOUSE_SEEDS === "1";
