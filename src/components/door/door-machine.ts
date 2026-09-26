import { READING_PAGE_PATH } from "@/lib/reading-room";
import { ROOMS } from "@/lib/matrix-rooms";
/**
 * TASK-185 Phase B — THE DOOR's state machine, as ruled (the Admiral,
 * 0018.06.18 a₿: the design stands).
 *
 * One walk, one identity: a soul is a NAME under @onecocreation, reached by
 * EMAIL (a six-digit code) or by a NOSTR KEY — two ways to the same name,
 * never two kinds of account. The sheet turns from sign-in to sign-up on
 * its own when the email (or key) is new — nobody hunts for a Sign up.
 *
 *   returning, email:  sign-in → code → in            (two steps)
 *   new, email:        sign-in → code → new-name → in (three steps)
 *   returning, key:    sign-in → in                   (one step)
 *   new, key:          sign-in → new-name → in        (two steps)
 *
 * Pure model, node-testable (this repo pins the model, not the render).
 */

export type DoorState = "closed" | "sign-in" | "code" | "new-name" | "in";

export type DoorEvent =
  | { type: "open" }
  | { type: "close" }
  | { type: "code-sent" }
  | { type: "verified"; isNew: boolean }
  | { type: "key-known" }
  | { type: "key-new" }
  | { type: "named" }
  | { type: "back" };

export function reduce(state: DoorState, event: DoorEvent): DoorState {
  switch (event.type) {
    case "open":
      return state === "closed" ? "sign-in" : state;
    case "close":
      return "closed";
    case "code-sent":
      return state === "sign-in" ? "code" : state;
    case "verified":
      return state === "code" ? (event.isNew ? "new-name" : "in") : state;
    case "key-known":
      return state === "sign-in" ? "in" : state;
    case "key-new":
      return state === "sign-in" ? "new-name" : state;
    case "named":
      return state === "new-name" ? "in" : state;
    case "back":
      if (state === "code" || state === "new-name") return "sign-in";
      return state;
  }
}

/** The walks, counted the way the Admiral counts them — the states a soul
 *  must act through before "in". */
export const DOOR_WALKS = {
  "returning-email": ["sign-in", "code"],
  "new-email": ["sign-in", "code", "new-name"],
  "returning-key": ["sign-in"],
  "new-key": ["sign-in", "new-name"],
} as const satisfies Record<string, readonly DoorState[]>;

export type DoorWalk = keyof typeof DOOR_WALKS;

/** A soul is new when the email's first verify finds no member profile, or
 *  when a good key owns no name yet — the server's own words, one test. */
export function isUnnamedKeyReason(reason: string | null | undefined): boolean {
  return !!reason && /doesn't own a tag/i.test(reason);
}

/** Where the walk lands after "in": a brand-new soul ALWAYS sees what's
 *  theirs now first (TASK-259, the Admiral's walk 0018.06.24 a₿: "after I
 *  choose my name it goes to a Continue screen that took me nowhere" — the
 *  old order checked `next` before `isNew`, so a new soul who arrived via
 *  `/login?next=/rooms/heart-field` skipped `/welcome` entirely and landed
 *  straight in a gated room with no session the room page could see yet).
 *  A same-origin `next` (validated by the caller) rides along as a query
 *  param so `/welcome` can offer ONE door onward. A returning soul keeps
 *  today's behaviour: `next` wins, else `/me` on the page mount, else the
 *  sheet just closes — the page behind never changed. */
export function landingFor(opts: { next: string | null; isNew: boolean; mount: "sheet" | "page" }): string | null {
  if (opts.isNew) return opts.next ? `/welcome?next=${encodeURIComponent(opts.next)}` : "/welcome";
  if (opts.next) return opts.next;
  return opts.mount === "page" ? "/me" : null; // null = close the sheet, stay put
}

/** TASK-259 — `/welcome`'s own continue-door words: a known `/rooms/<slug>`
 *  names the room by its real title (the rooms config, the one source of
 *  truth); anything else is the plain word, never a guessed label built
 *  from the raw path (derive-or-dash). TASK-465 (block 968,561): a hidden
 *  room never gets named here either — its own /rooms/<slug> address
 *  notFounds, so naming it in a continue button would point at a dead
 *  door. */
export function continueLabel(path: string | null): string {
  const slug = path ? /^\/rooms\/([^/?]+)/.exec(path)?.[1] : null;
  const room = slug ? ROOMS.find((r) => !r.hidden && r.id.slice(1, r.id.indexOf(":")) === slug) : null;
  return room ? `Continue to ${room.title}` : "Continue";
}

/** The member menu — the whole of it (Number One, from the Admiral's words).
 *  Ruling 1 (0018.06.18 a₿): /welcome keeps its URL as the post-sign-in
 *  "what's yours now" page, linked from this menu. */
export const MEMBER_MENU: readonly { label: string; href: string }[] = [
  { label: "Welcome", href: "/welcome" }, // ruling 1 — the `in` step became this page; TASK-405 (W-20/E5): "What's yours now" → "Welcome" — it IS the welcome thread
  { label: "My library", href: "/me" }, // T-173's purchases live on /me
  { label: "Calendar", href: "/me?tab=calendar" }, // TASK-211 (0018.06.23 a₿, Love's call #18): "My sessions" → "Calendar"; TASK-405 (W-20): /me/calendar → /me?tab=calendar — the calendar tab, not a separate page
  /* TASK-210 (0018.06.23 a₿, Love's 0018.06.18 call 01:11:02 "the
     reading-room link from the user menu lands in the wrong place"): the
     row was hardwired to the tier-B Chronicles room, so a member without
     that package met a package wall. The member's reading room is the FREE
     one — the same derivation as the home card (T-174: minTier "all", the
     Heart Field Commons). Derive-or-dash: no free room → no row. */
  { label: "Read with Love", href: READING_PAGE_PATH },
];

/** K7 (0018.06.17 a₿) — real or bot: ONE honest badge wherever a soul is
 *  listed. email = an inbox answered a code; key = a signer signed. The
 *  session's own space is the truth — "email" for the inbox door, the
 *  Spaces community name for a claimed key — and anything the site doesn't
 *  know is a dash, never a guess (derive-or-dash). */
export type DoorProof = "by email" | "by key";
export function proofFor(space: string | null | undefined): DoorProof | null {
  if (!space) return null;
  return space === "email" ? "by email" : "by key";
}

/** The door speaks as Love does. Every rendered word in the door derives
 *  from this table — the voice pin tests THIS, once. */
export const DOOR_COPY: Record<Exclude<DoorState, "closed">, {
  title: string;
  note: string;
  cta: string;
  busyCta: string;
}> = {
  "sign-in": {
    title: "Welcome home",
    note: "Your email or your key — both lead to the same name, your name in the field. No passwords, nothing to remember.",
    cta: "Email me a code",
    busyCta: "Sending your code…",
  },
  code: {
    title: "Six little digits",
    note: "A code is on its way to your inbox — it works for ten minutes, only here.",
    cta: "Step in",
    busyCta: "Opening the door…",
  },
  "new-name": {
    title: "Your name in the field",
    note: "This is how the circle knows you. Claim it once and it's yours — sovereign, verifiable, free.",
    cta: "Claim my name",
    busyCta: "Claiming…",
  },
  in: {
    title: "You're in",
    note: "Welcome home. Your doors are open.",
    cta: "Continue",
    busyCta: "Continue",
  },
};

export const DOOR_KEY_NOTE =
  "Have a key? One tap to sign — it signs you in here and anywhere else that speaks it.";
export const DOOR_KEY_CTA = "Sign in with my key";
export const DOOR_BACK = "← a different email";
export const DOOR_NAME_SUFFIX = "@onecocreation";

/** Block 968,624 (VERDICT-968624.md / L4-TRACE.md §4 item 2, ASTRA-REVIEW.md
 *  L4 "No false success") — the "code" state above is reachable ONLY from a
 *  successful `code-sent` event (`reduce()`), so this confirmation is
 *  honest wherever a caller renders it: it never appears before the server
 *  actually accepted the send. Pure data, kept beside DOOR_COPY so
 *  DoorSheet.tsx and SignInCard.tsx render the same words in lockstep. */
export const DOOR_SEND_CONFIRMATION = "Code sent. Check your inbox.";

/** A client fetch timeout for the send-code call. A slow relay must fail
 *  fast (mail.ts's own transport timeout is the other half of this), but a
 *  client-side abort does NOT cancel a server-side SMTP send already under
 *  way (VERDICT-968624: "client abort does not cancel server-side SMTP;
 *  retrying can deliver multiple codes") — so this note never claims
 *  failure, only an honest, uncertain outcome. */
export const DOOR_SEND_TIMEOUT_MS = 25_000;
export const DOOR_SEND_TIMEOUT_NOTE =
  "This is taking longer than usual. Check your inbox before trying again.";
