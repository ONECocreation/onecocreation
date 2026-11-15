/**
 * "11:11 LIVE WITH LOVE" — the one address (block 976,007, the Admiral's
 * desk answer B: "thought the live with love was to go to her youtube page
 * with the lives. you should have the link").
 *
 * Every "11:11 Live with Love" door reads THIS constant, never its own
 * copy: the built-in menu row (NavMenu.tsx buildDefaultMenu), the home
 * Connect section's card and the /contact door (both ContactDoors.tsx),
 * and the /classes spotlight card (CommunitySpotlight.tsx). It is the
 * channel's Live tab, so a visitor lands on her lives, not the channel
 * front page.
 *
 * Client-safe on purpose (no fs, no env): NavMenu is a "use client"
 * module and `@/lib/live` is server-only, so the address cannot live
 * there. live.ts's LIVE_YOUTUBE (the channel root, used by /live and the
 * /a console) is a different door and is left as it is.
 */
export const LIVE_WITH_LOVE_URL = "https://www.youtube.com/@Onecocreation/streams";
