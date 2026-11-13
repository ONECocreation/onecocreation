/** Provisional copy slots for Lumen's review. No server imports: shared by UI and mail. */
export const deliveryCopy = {
  notQueued: "Not scheduled yet. Check the list, then press Schedule.",
  leave: "This letter isn't scheduled yet. Stay here to schedule it?",
  intentSaved: "Your chosen time is remembered. This does not schedule or send the letter.",
  intentFailed: "Your chosen time could not be remembered. Keep this page open and try again.",
  unknown: "Send status unavailable. Check again before sending.",
  unverified: "The send request was accepted, but its record could not be confirmed. Check its status before trying again.",
  tickMissing: "No completed mail run recorded yet.",
};
export function deliveryTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "longGeneric" }).format(new Date(iso));
}
export interface DeliverySummary { state: "draft" | "scheduled" | "sending" | "sent" | "cancelled" | "unknown"; sent?: number; queued?: number; dropped?: number; at?: string }
export function deliveryWords(s: DeliverySummary): string {
  switch (s.state) {
    case "draft": return "Draft · no recorded list send";
    case "scheduled": return `Scheduled for ${deliveryTime(s.at!)}`;
    case "sending": return `Sending · ${s.sent} of ${s.queued} sent`;
    case "sent": return `Sent to ${s.sent}${s.dropped ? ` · ${s.dropped} not sent` : ""}`;
    case "cancelled": return `Cancelled${s.sent ? ` · ${s.sent} sent before it stopped` : ""}`;
    default: return deliveryCopy.unknown;
  }
}
export function deliveryNotice(kind: "scheduled" | "sent" | "missed", p: { subject: string; at: string; queued: number; sent: number; dropped: number; url: string }) {
  if (kind === "scheduled") return { subject: `Scheduled: ${p.subject}`, body: `${p.subject} is scheduled for ${p.queued} people, starting ${deliveryTime(p.at)}. Copies go out on the next mail run at or after that time.\n\nOpen the letter: ${p.url}` };
  if (kind === "sent") return { subject: `Sent to ${p.sent}: ${p.subject}`, body: `${p.subject} has finished sending. Sent to ${p.sent}.${p.dropped ? ` ${p.dropped} copies were not sent.` : ""}\n\nOpen the letter: ${p.url}` };
  return { subject: `Still waiting: ${p.subject}`, body: `The time you chose for ${p.subject}, ${deliveryTime(p.at)}, has passed, and there is no recorded list send. Nothing has been sent by this reminder.\n\nWhen you are ready, open the letter and choose what happens next: ${p.url}` };
}
