/**
 * TASK-185 Phase A — THE DOOR's state machine (prototype; throwaway if the
 * Admiral's ruling changes the shape).
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

/** Where the walk lands after "in": a `?next=` wins (validated same-origin
 *  by the caller), a brand-new soul sees what's theirs now, a returning
 *  soul in the SHEET simply stays — the page behind never changed. */
export function landingFor(opts: { next: string | null; isNew: boolean; mount: "sheet" | "page" }): string | null {
  if (opts.next) return opts.next;
  if (opts.isNew) return "/welcome";
  return opts.mount === "page" ? "/me" : null; // null = close the sheet, stay put
}

/** The member menu — the whole of it (Number One, from the Admiral's words). */
export const MEMBER_MENU = [
  { label: "My library", href: "/me" }, // T-173's purchases live on /me
  { label: "My sessions", href: "/me/calendar" },
  { label: "The reading room", href: "/rooms/weekly-reading" },
] as const;

/** The door speaks as Love does. Every rendered word in the door derives
 *  from this table — the arcade-voice pin tests THIS, once. */
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
