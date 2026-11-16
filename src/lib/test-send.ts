import crypto from "crypto";
import { enqueue, initSendRecord, recordTestSendForLetter } from "@/lib/mail-queue";

/**
 * A TEST copy of a letter to ONE address (block 976,142, the Admiral's A).
 *
 * Untimed: one queued copy, no sendId, no record. Exactly what the panel
 * always did; it goes out on the next mail run.
 *
 * Timed: the same one copy, carrying `notBefore`, so it waits in the SAME
 * queue and leaves on the SAME tick a scheduled list send would. That is the
 * point: when it arrives on time it proves the path a scheduled list send
 * takes. It also gets a sendId and a send record marked `test`, so the panel
 * can show it and Cancel it before it leaves (tick() reads the record).
 *
 * Neither shape touches the list: no listSubscribers, no headcount, no
 * `letters:sends:<key>` history, no member's /letters mailbox
 * (recordDelivery), no delivery notice, no saved schedule intent.
 */
export interface TestCopyOptions {
  key: string;
  /** the letter's own subject; the "[test]" mark is added here */
  subject: string;
  to: string;
  html: string;
  /** epoch ms the copy waits for; omitted = next mail run */
  notBefore?: number;
}

export type TestCopyResult =
  | { ok: true; queued: 1; test: true }
  | { ok: true; queued: 1; test: true; sendId: string; scheduledFor: string };

export async function queueTestCopy(opts: TestCopyOptions): Promise<TestCopyResult> {
  const subject = `[test] ${opts.subject}`;
  if (opts.notBefore === undefined) {
    await enqueue([{ to: opts.to, subject, html: opts.html }]);
    return { ok: true, queued: 1, test: true };
  }
  const sendId = crypto.randomUUID();
  const scheduledFor = new Date(opts.notBefore).toISOString();
  await enqueue([{ to: opts.to, subject, html: opts.html, notBefore: opts.notBefore, sendId }]);
  await initSendRecord(sendId, { key: opts.key, queued: 1, segment: "test", scheduledFor, test: true });
  await recordTestSendForLetter(opts.key, sendId);
  return { ok: true, queued: 1, test: true, sendId, scheduledFor };
}
