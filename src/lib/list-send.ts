import crypto from "crypto";
import { letterHtml } from "@/lib/letters";
import { listSubscribers, unsubscribeUrl } from "@/lib/subscribers";
import { enqueue, initSendRecord, recordSendForLetter } from "@/lib/mail-queue";
import { recordDelivery } from "@/lib/mailbox";

/**
 * THE LIST SEND (extracted from /api/admin/letters/send for T-638, block
 * 972,735): the one path a letter takes to the whole list. The operator's
 * panel route and the replays catch-up letter both call this, so there is
 * ONE queue, ONE once-key family (the subscribed guard on every copy), ONE
 * hourly cap and ONE send record. Nothing here invents a mail path: every
 * copy is a queued item that `tick()` drains under the cap, and a copy to
 * someone who unsubscribes while it waits is dropped at send time by the
 * "subscribed" guard. `listSubscribers` already excludes anyone removed.
 *
 * The route keeps its own gates (operator cookie, typed headcount); the
 * automatic caller keeps its own (the kill switch, the once-key per replay
 * set). This function only does the queueing and the bookkeeping.
 */
export interface ListSendOptions {
  key: string;
  subject: string;
  body: string;
  /** a segment (a door's `source`); omitted = the whole list */
  source?: string;
  /** epoch ms the copies wait for; omitted = next tick */
  notBefore?: number;
  /** the seeded letters' own site page; absent for a composed letter */
  webUrl?: string;
  /** the route already read the list to check the typed headcount */
  list?: string[];
}

export interface ListSendResult {
  sendId: string;
  queued: number;
  segment: string;
  recipients: string[];
  scheduledFor: string;
  atMs: number;
}

export async function sendLetterToList(opts: ListSendOptions): Promise<ListSendResult> {
  const source = opts.source && opts.source !== "all" ? opts.source : undefined;
  const list = opts.list ?? (await listSubscribers(source ? { source } : {}));
  const htmlFor = (to: string) => letterHtml(opts.body, { webUrl: opts.webUrl, unsubscribeUrl: unsubscribeUrl(to) });
  // T-484 (walk item S7): one sendId per list send, every queued copy carries it
  const sendId = crypto.randomUUID();
  const scheduledFor = opts.notBefore ? new Date(opts.notBefore).toISOString() : "next tick";
  await enqueue(
    list.map((to) => ({
      to,
      subject: opts.subject,
      html: htmlFor(to),
      notBefore: opts.notBefore,
      guard: { kind: "subscribed" as const },
      sendId,
    })),
  );
  await initSendRecord(sendId, { key: opts.key, queued: list.length, segment: source ?? "all", scheduledFor });
  await recordSendForLetter(opts.key, sendId);
  // the mailbox remembers: each member's /letters shows what THEY received
  const atMs = opts.notBefore ?? Date.now();
  for (const to of list) {
    await recordDelivery(to, { key: opts.key, subject: opts.subject, atMs }).catch(() => {});
  }
  return { sendId, queued: list.length, segment: source ?? "all", recipients: list, scheduledFor, atMs };
}
