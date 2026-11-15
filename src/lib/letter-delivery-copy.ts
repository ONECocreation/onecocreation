/** Provisional copy slots for Lumen's review. No server imports: shared by UI and mail. */
export const deliveryCopy = {
  notQueued: "Not scheduled yet. Check the list, then press Schedule.",
  leave: "This letter is not scheduled yet. Press OK to stay and schedule it. Press Cancel to leave. Your time stays saved.",
  // Same words without the last sentence: used when her time has not been confirmed saved.
  leaveUnsaved: "This letter is not scheduled yet. Press OK to stay and schedule it. Press Cancel to leave.",
  intentSaved: "Your time is saved. That alone does not send the letter.",
  intentSaving: "Saving your time…",
  intentFailed: "Your time was not saved. Keep this page open and pick the time again.",
  unknown: "The send record can't be read right now. Reload the page before you send.",
  unverified: "Your send was accepted, but the house could not confirm its record. Do not send again yet. Reload this page and look for it in the list below.",
  tickMissing: "No mail run has finished yet.",
  tickLate: "That is more than 20 minutes ago. Letters may go out late.",
  tickUnavailable: "The last mail run can't be read right now.",
};
export function deliveryTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "longGeneric" }).format(new Date(iso));
}
export interface DeliverySummary { state: "draft" | "scheduled" | "sending" | "sent" | "cancelled" | "unknown"; sent?: number; queued?: number; dropped?: number; at?: string }
export function deliveryWords(s: DeliverySummary): string {
  switch (s.state) {
    case "draft": return "Draft · no send to the list on record";
    case "scheduled": return `Scheduled for ${deliveryTime(s.at!)}`;
    case "sending": return `Sending · ${s.sent} of ${s.queued} sent`;
    case "sent": return `Sent to ${s.sent}${s.dropped ? ` · ${s.dropped} not sent` : ""}`;
    case "cancelled": return `Cancelled${s.sent ? ` · ${s.sent} sent before it stopped` : ""}`;
    default: return deliveryCopy.unknown;
  }
}
const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
export function deliveryNotice(kind: "scheduled" | "sent" | "missed", p: { subject: string; at: string; queued: number; sent: number; dropped: number; url: string }) {
  if (kind === "scheduled") return { subject: `Scheduled: ${p.subject}`, body: `“${p.subject}” is scheduled for ${people(p.queued)}. It starts ${deliveryTime(p.at)}, on the first mail run at or after that time.\n\nOpen the letter: ${p.url}` };
  if (kind === "sent") return { subject: `Sent to ${p.sent}: ${p.subject}`, body: `“${p.subject}” has gone out. Sent to ${people(p.sent)}.${p.dropped ? ` ${p.dropped} ${p.dropped === 1 ? "copy was" : "copies were"} not sent.` : ""}\n\nOpen the letter: ${p.url}` };
  return { subject: `Still waiting: ${p.subject}`, body: `You chose ${deliveryTime(p.at)} for “${p.subject}”. That time has passed, and the house has no record of this letter going to the list. This note sends nothing.\n\nWhen you are ready, open the letter. Press Send now, or pick a new time and press Schedule: ${p.url}` };
}
