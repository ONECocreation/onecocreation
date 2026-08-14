import { enqueue } from "./mail-queue";
import { brandShell } from "./mail";

/**
 * The 72-hour hold's reminder letters (ruling #1, 0018.05.13): one at +24h
 * and one at +48h, each nudged into "ok times" — 9a–7p in the artist's zone —
 * because a held haircut is not a 3am matter.
 *
 * The letters are GUARDED: mail-queue's tick re-checks the cart before
 * sending, so a basket that checked out (or a hold that lapsed) never gets a
 * ghost reminder. Only member carts with an email door get letters at all —
 * an anonymous basket has no address to write to, and that's honest.
 */

const OK_START = 9; // 9a
const OK_END = 19; // 7p — last send hour is 6:59p

function hourIn(tz: string, atMs: number): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" })
      .format(new Date(atMs)),
  );
}

/** Shift a moment forward into the 9a–7p window in `tz` (never backward —
 *  a reminder may arrive late, never early). */
export function okTimeMs(targetMs: number, tz: string): number {
  let at = targetMs;
  for (let i = 0; i < 30; i++) {
    const h = hourIn(tz, at);
    if (h >= OK_START && h < OK_END) return at;
    at += 30 * 60_000; // walk forward half-hour steps until inside the window
  }
  return targetMs; // a zone that never resolves — send at target rather than never
}

export function holdReminderLetters(opts: {
  to: string;
  cartId: string;
  holdId: string;
  serviceTitle: string;
  whenLocal: string; // the slot, spoken in the artist's zone
  artistTz: string;
  holdUntilMs: number;
  baseUrl: string;
}): Parameters<typeof enqueue>[0] {
  const body = (hoursLeft: number) => brandShell(
    `<p>Your time is still held for you 🕊️</p>
     <p><b>${opts.serviceTitle}</b><br/>${opts.whenLocal}</p>
     <p>It stays yours for about <b>${hoursLeft} more hours</b> — finish checking out
     whenever you're ready, and the time is confirmed.</p>
     <p style="text-align:center;margin:24px 0;">
       <a href="${opts.baseUrl}/cart" style="background:#b4862b;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;">Open my basket</a>
     </p>
     <p>If life moved on, no worries at all — the hold simply lets go on its own.</p>`,
  );
  const mk = (offsetH: number) => ({
    to: opts.to,
    subject: `Still holding your time — ${opts.serviceTitle}`,
    html: body(Math.max(1, Math.round((opts.holdUntilMs - Date.now() - offsetH * 3600_000) / 3600_000))),
    notBefore: okTimeMs(Date.now() + offsetH * 3600_000, opts.artistTz),
    guard: { kind: "cart-hold" as const, cartId: opts.cartId, holdId: opts.holdId },
  });
  return [mk(24), mk(48)];
}
