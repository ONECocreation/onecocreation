import { brandShell, mailConfigured, onceWithin, pill, sendMail } from "./mail";
import { recordDelivery } from "./mailbox";

/**
 * TASK-304 (0018.06.26 a₿) — "Send to user": the studio's guest door as a
 * ONE-member transactional letter (T-292 DESIGN.md §2 Page C; the studio
 * walk notes, finding 2). mail-booking.ts's shape, not the list-send
 * route's: the letter's variables (the room's name, the join link) are
 * per-member and load-bearing — letters.ts's own ruling keeps those
 * code-built. The generic send route's testTo branch returns BEFORE its
 * recordDelivery, so this sender records the mailbox entry itself. The
 * guest door only — never the keyed director link; one member per call,
 * never a list.
 */

export interface StudioInvite {
  to: string;
  /** the room's human name — the chooser's own prop down from /a/studio's
      page constant; "" / undefined falls back to StudioRoom's own generic */
  roomTitle?: string;
  /** the guest door — server-minted via meetStudioUrl, keyless by
      construction; never a client-supplied URL, never the director link */
  joinUrl: string;
  /** the doc's countdown target (ISO) — "" / undefined = the letter carries
      no time at all (derive-or-dash, never an invented one) */
  startsAt?: string;
  /** the doc's after-hours line — "" / undefined = omitted */
  afterHoursLine?: string;
}

export type StudioInviteResult =
  | { ok: true; warning?: string }
  | { ok: false; code: "dark" | "duplicate" | "send-failed"; reason: string };

function roomName(inv: StudioInvite): string {
  return inv.roomTitle?.trim() || "the studio";
}

/** The letter's body, pure — the mint the tests pin: the guest door's own
    shape, and never a director/key/password parameter anywhere. */
export function studioInviteHtml(inv: StudioInvite): string {
  const when = inv.startsAt
    ? `<p><b>When:</b> ${new Date(inv.startsAt).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      })}</p>`
    : "";
  const after = inv.afterHoursLine?.trim() ? `<p>${inv.afterHoursLine}</p>` : "";
  return brandShell(
    `<p>Hello,</p>
     <p>You&rsquo;re invited into <b>${roomName(inv)}</b> — camera and mic stay off
     until you choose, and the door opens right on the site.</p>
     ${when}
     <p style="text-align:center;padding:10px 0;">${pill(inv.joinUrl, "Open the guest door", "lg")}</p>
     <p>If the button misbehaves, the door is
     <a href="${inv.joinUrl}" style="color:#E7B2C3;">${inv.joinUrl}</a></p>
     ${after}
     <p>With love,<br/>Love</p>`,
  );
}

export async function sendStudioInvite(inv: StudioInvite): Promise<StudioInviteResult> {
  const to = inv.to.trim().toLowerCase();
  if (!to.includes("@")) return { ok: false, code: "send-failed", reason: "that doesn't look like an email address" };
  if (!mailConfigured("bookings")) {
    return { ok: false, code: "dark", reason: "the mail rail is dark — the bookings persona isn't configured" };
  }
  /* TASK-214's own idiom: the same invite to the same member inside a few
     seconds is a double-click, not a second letter. */
  if (!(await onceWithin(`studio-invite:${to}:${inv.joinUrl}`, 10_000))) {
    return { ok: false, code: "duplicate", reason: "just sent — that letter is already on its way" };
  }
  const subject = `${roomName(inv)} — you're invited`;
  try {
    await sendMail("bookings", { to, subject, html: studioInviteHtml(inv) });
  } catch (e) {
    return { ok: false, code: "send-failed", reason: e instanceof Error ? e.message : "the mail rail refused the send" };
  }
  /* the "push to their profile" DESIGN.md asks for — recorded explicitly,
     since the generic route's single-recipient path never does it. A KV
     failure here must not read as an unsent letter: the mail already left. */
  try {
    await recordDelivery(to, { key: "studio-invite", subject, atMs: Date.now() });
  } catch {
    return { ok: true, warning: "sent, but the mailbox record failed — it won't show on their /letters" };
  }
  return { ok: true };
}
