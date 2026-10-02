/**
 * T-541b: the words and the small decisions behind the membership UI.
 * PURE and client-safe (no server imports): the join box, the /me panel and
 * the Money desk card all read their copy and their state logic from here,
 * so one test file pins what a member is told. No em dashes, no arrows.
 */

export type UiTier = "A" | "B" | "C";
export type UiStatus = "pending" | "active" | "past_due" | "cancelling" | "canceled" | "paused" | "refunded";

/** What GET /api/member/subscription returns (the 541a publicView). */
export interface SubView {
  status: UiStatus;
  tier: UiTier;
  tierName: string;
  variant?: string;
  chargedThroughMs: number | null;
  expiresAtMs: number | null;
  canceledAtMs: number | null;
  pendingSwapTier: UiTier | null;
  upgrades: { tier: UiTier; name: string; differenceCents: number }[];
}

export interface CallResult {
  ok: boolean;
  subscription?: SubView | null;
  code?: string;
  reason?: string;
}

/** Square's Web Payments SDK lives on its own official hosts, one per environment. */
export const SQUARE_SDK_HOSTS = {
  sandbox: "https://sandbox.web.squarecdn.com",
  production: "https://web.squarecdn.com",
} as const;
export const squareSdkUrl = (environment: string | null | undefined): string =>
  `${environment === "production" ? SQUARE_SDK_HOSTS.production : SQUARE_SDK_HOSTS.sandbox}/v1/square.js`;

const TZ = "America/Los_Angeles";
/** "November 2, 2026", in the studio's own time zone (matches how 541a derives the day). */
export function dateWords(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: TZ });
}
export function dateShort(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ });
}

export const dollarsOf = (cents: number): string =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;

/** The one plain promise under the card box. */
export function monthlyLine(priceUsd: number): string {
  return `$${priceUsd} a month. Renews monthly. Cancel any time.`;
}

/** Every code the routes can answer with, in human words. */
const CODE_WORDS: Record<string, string> = {
  already_subscribed: "You already have this membership, or a higher one. You can manage it in your account.",
  use_upgrade: "You already have a membership. Use Upgrade in your account to move up.",
  offer_closed: "That offer is not open right now. You can still join at the regular price.",
  offer_used: "That offer is for first-time members. You can still join at the regular price.",
  plan_not_configured: "This membership is not ready to join yet. Please check back soon.",
  email_required: "We need an email address for your receipts. Add one below and try again.",
  card_declined: "Your card was declined. Nothing was charged. Please check the details or try another card.",
  payment_failed: "That payment did not go through. Nothing was charged. Please try again.",
  undo_cancel_first: "Keep your membership first, then you can upgrade.",
  payment_needed: "Your last payment needs attention first. Please settle it, then try again.",
  store_unavailable: "Memberships are not available right now. Please try again in a little while.",
  not_active: "This membership is not active.",
  not_cancelling: "This membership is not set to end.",
  not_an_upgrade: "Please pick a higher membership.",
  no_seat: "Please sign in with your own account first.",
  bad_card: "We could not read the card. Please try again.",
  square_error: "Something went wrong on the payment side. Nothing was charged. Please try again.",
};
const STATUS_WORDS: Record<number, string> = {
  401: "Please sign in first.",
  403: "That request was refused. Please reload the page and try again.",
  404: "Memberships are not open yet.",
  429: "Too many tries. Please wait a little, then try again.",
};
export function errorWords(res: { code?: string; reason?: string; httpStatus?: number } | null): string {
  if (!res) return "We could not reach the site. Please check your connection and try again.";
  if (res.code && CODE_WORDS[res.code]) return CODE_WORDS[res.code];
  if (res.httpStatus && STATUS_WORDS[res.httpStatus]) return STATUS_WORDS[res.httpStatus];
  return "Something went wrong. Nothing was charged. Please try again.";
}

/* ── the join box ───────────────────────────────────────────────────────── */

/** Where the join box is: signed out meets the sign-in door first. */
export type JoinStage = "checking" | "signed-out" | "ready" | "already" | "off";

export function joinStage(input: { checked: boolean; signedIn: boolean; configOk: boolean | null; subscription: SubView | null | undefined }): JoinStage {
  if (!input.checked) return "checking";
  if (!input.signedIn) return "signed-out";
  if (input.configOk === null || input.subscription === undefined) return "checking";
  if (input.configOk === false) return "off";
  const s = input.subscription;
  if (s && (s.status === "active" || s.status === "past_due" || s.status === "cancelling" || s.status === "pending" || s.status === "paused")) return "already";
  return "ready";
}

export interface JoinOffer { variant: "standard" | "A" | "B" | "C"; line: string | null }

/** The promo variant to offer for a tier: the first open one that has a plan and words; else the regular price. */
export function pickOffer(
  open: string[],
  offers: Partial<Record<string, string>> | undefined,
  usedBefore: boolean,
): JoinOffer {
  if (!usedBefore) {
    for (const v of ["A", "B", "C"] as const) {
      if (open.includes(v) && offers?.[v]) return { variant: v, line: offers[v] as string };
    }
  }
  return { variant: "standard", line: null };
}

/** Square's pricing phases -> one honest sentence (server side, from the plan listing). */
export function offerLineFromPhases(
  phases: { ordinal: number; periods: number | null; priceCents: number | null }[],
): string | null {
  const ph = [...phases].sort((a, b) => a.ordinal - b.ordinal);
  if (!ph.length || ph.some((p) => p.priceCents == null)) return null;
  if (ph.length === 1) return `${dollarsOf(ph[0].priceCents as number)} a month.`;
  const first = ph[0];
  const rest = ph[ph.length - 1];
  const firstWhen = first.periods && first.periods > 1 ? `your first ${first.periods} months` : "your first month";
  if (first.priceCents === 0) return `Free for ${firstWhen}, then ${dollarsOf(rest.priceCents as number)} a month.`;
  return `${dollarsOf(first.priceCents as number)} for ${firstWhen}, then ${dollarsOf(rest.priceCents as number)} a month.`;
}

/* ── /me panel ──────────────────────────────────────────────────────────── */

export interface PanelFacts {
  title: string;
  /** the ONE state line: renews / ends / payment needed */
  stateLine: string;
  canCancel: boolean;
  canUndo: boolean;
  canUpgrade: boolean;
  /** extra words (a scheduled move, a payment note), never a second state */
  note: string | null;
}

export function panelFacts(sub: SubView, nowMs: number = Date.now()): PanelFacts | null {
  const through = sub.chargedThroughMs ?? sub.expiresAtMs;
  const endsAt = sub.canceledAtMs ?? through;
  switch (sub.status) {
    case "active":
      return {
        title: sub.tierName,
        stateLine: through ? `Renews on ${dateWords(through)}` : "Active",
        canCancel: true, canUndo: false, canUpgrade: sub.upgrades.length > 0,
        note: sub.pendingSwapTier ? "Your new price starts with your next payment." : null,
      };
    case "cancelling":
      return {
        title: sub.tierName,
        stateLine: endsAt ? `Ends on ${dateWords(endsAt)}` : "Ending soon",
        canCancel: false, canUndo: true, canUpgrade: false,
        note: "You keep your access until then. Nothing more will be charged.",
      };
    case "past_due":
      return {
        title: sub.tierName,
        stateLine: "Payment needed",
        canCancel: true, canUndo: false, canUpgrade: false,
        note: sub.expiresAtMs
          ? `Your card did not go through. Your access stays open until ${dateWords(sub.expiresAtMs)}. Square has emailed you a link to pay.`
          : "Your card did not go through. Square has emailed you a link to pay.",
      };
    case "pending":
      return { title: sub.tierName, stateLine: "Starting", canCancel: false, canUndo: false, canUpgrade: false, note: "Your membership is being set up." };
    case "paused":
      return { title: sub.tierName, stateLine: "Paused", canCancel: false, canUndo: false, canUpgrade: false, note: null };
    case "canceled":
      // cancelled, but paid time is left (e.g. a free first month): say when it ends, no controls
      if ((sub.expiresAtMs ?? 0) > nowMs) {
        return {
          title: sub.tierName,
          stateLine: `Ends on ${dateWords(sub.expiresAtMs as number)}`,
          canCancel: false, canUndo: false, canUpgrade: false,
          note: "This membership is cancelled. You keep your access until then. You can join again any time.",
        };
      }
      return null; // already over: the ended notice owns it
    default:
      return null; // refunded: the ended notice owns it
  }
}

/** Whether the old "membership ended" notice should stay quiet: a live or ending subscription says everything itself. */
export const subscriptionOwnsNotice = (sub: SubView | null | undefined, nowMs: number = Date.now()): boolean => !!sub && panelFacts(sub, nowMs) !== null;

export const cancelConfirmWords = (endsMs: number | null): string =>
  endsMs
    ? `You keep access until ${dateWords(endsMs)}. Nothing more will be charged after that. There is no going back once the date passes, but you can keep your membership any time before it.`
    : "You keep access until the end of the month you paid for. Nothing more will be charged.";

export const upgradeLine = (u: { name: string; differenceCents: number }, nextPriceUsd: number): string =>
  `Pay ${dollarsOf(u.differenceCents)} now for the rest of this month. Then $${nextPriceUsd} a month.`;

/* ── Money desk ─────────────────────────────────────────────────────────── */

export const abbreviateSubject = (subject: string): string => {
  const at = subject.lastIndexOf("@");
  const handle = at > 0 ? subject.slice(0, at) : subject;
  const space = at > 0 ? subject.slice(at) : "";
  // an email door: keep two letters of the address and its domain, drop the "@email" door word
  const mail = handle.indexOf("@");
  if (space === "@email" && mail > 0) return `${handle.slice(0, Math.min(2, mail))}...${handle.slice(mail)}`;
  const h = handle.length > 12 ? `${handle.slice(0, 6)}...${handle.slice(-4)}` : handle;
  return `${h}${space}`;
};

export type DeskStatus = "active" | "cancelling" | "past due" | "ended" | "starting" | "paused";
export function deskStatus(status: UiStatus): DeskStatus {
  switch (status) {
    case "active": return "active";
    case "cancelling": return "cancelling";
    case "past_due": return "past due";
    case "pending": return "starting";
    case "paused": return "paused";
    default: return "ended";
  }
}
/** The ONE state chip text: the state and its date said once. */
export function deskChip(status: UiStatus, chargedThroughMs?: number | null, expiresAtMs?: number | null, canceledAtMs?: number | null): string {
  const s = deskStatus(status);
  const when = (ms?: number | null) => (ms ? ` ${dateShort(ms)}` : "");
  if (s === "active") return `Active, renews${when(chargedThroughMs ?? expiresAtMs)}`;
  if (s === "cancelling") return `Cancelling, ends${when(canceledAtMs ?? chargedThroughMs)}`;
  if (s === "past due") return `Past due, access to${when(expiresAtMs ?? chargedThroughMs)}`;
  if (s === "ended") return `Ended${when(canceledAtMs ?? chargedThroughMs ?? expiresAtMs)}`;
  return s[0].toUpperCase() + s.slice(1);
}
export const deskTone = (s: DeskStatus): "green" | "gold" | "rose" | "grey" =>
  s === "active" ? "green" : s === "cancelling" || s === "starting" || s === "paused" ? "gold" : s === "past due" ? "rose" : "grey";
