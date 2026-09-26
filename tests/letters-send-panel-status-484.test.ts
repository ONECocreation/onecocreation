import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { listSendOutcomeLine, testSendOutcomeLine, pollShouldStop, sendToReArm, type ListSendOutcome, type TestSendOutcome, type SendRecord } from "@/app/a/letters/[key]/page";

/**
 * TASK-484 — the send panel's own status line, pinned at the model (the
 * house's "pin the model, not the render" idiom: this file has no React
 * renderer, no @testing-library — the pure line/stop-rule functions carry
 * every real behavior, and a handful of source-text assertions pin the
 * JSX shape the /a uniformity law requires — see tests/me-signed-out.test.ts
 * for the same pattern elsewhere in this repo).
 *
 * Covers: item 1 (Sending… immediately, one line per outcome, the exact
 * success wording — next-tick and scheduled-in-two-clocks), the poll's
 * own stop rule (item 2's "every 15s, stop when done or after 30 min"),
 * and the /a uniformity law itself (one state line, aria-live, error
 * REPLACES rather than adds, no em dash/arrow/emoji in a label).
 */

const SRC = fs.readFileSync(path.join(process.cwd(), "src/app/a/letters/[key]/page.tsx"), "utf8");

describe("listSendOutcomeLine — the list-send control's ONE line", () => {
  it("idle is silent — nothing rendered before a click", () => {
    expect(listSendOutcomeLine({ kind: "idle" })).toBe("");
  });

  it("sending shows immediately, before any route response", () => {
    expect(listSendOutcomeLine({ kind: "sending" })).toBe("Sending…");
  });

  it("a route failure is shown in the route's own plain words, verbatim", () => {
    expect(listSendOutcomeLine({ kind: "err", reason: "type the exact count to send" })).toBe("type the exact count to send");
  });

  it("success, next tick, plural: 'Queued for 6 people. Goes out within 10 minutes.'", () => {
    const o: ListSendOutcome = { kind: "queued", queued: 6, scheduledFor: "next tick" };
    expect(listSendOutcomeLine(o)).toBe("Queued for 6 people. Goes out within 10 minutes.");
  });

  it("success, next tick, singular: 'person', not 'people'", () => {
    const o: ListSendOutcome = { kind: "queued", queued: 1, scheduledFor: "next tick" };
    expect(listSendOutcomeLine(o)).toBe("Queued for 1 person. Goes out within 10 minutes.");
  });

  it("a real schedule reads in Mountain AND the viewer's own clock, both computed from the same instant", () => {
    const iso = "2026-10-03T11:55:00.000Z"; // 5:55 AM MDT
    const o: ListSendOutcome = { kind: "queued", queued: 6, scheduledFor: iso };
    const line = listSendOutcomeLine(o);
    const mountain = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
    const viewer = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
    expect(line).toBe(`Scheduled for ${mountain} Mountain (${viewer} your time).`);
  });

  it("mid-progress: 'Sent to 3 of 6.' — the queued count never disappears", () => {
    const o: ListSendOutcome = { kind: "progress", queued: 6, sent: 3, dropped: 0 };
    expect(listSendOutcomeLine(o)).toBe("Sent to 3 of 6.");
  });

  it("dropped copies still count toward 'done' even though the line only names sent/queued", () => {
    const o: ListSendOutcome = { kind: "progress", queued: 6, sent: 4, dropped: 2 };
    expect(listSendOutcomeLine(o)).toBe("Sent to all 6 people.");
  });

  it("done, exactly on sent alone: 'Sent to all 6.'", () => {
    const o: ListSendOutcome = { kind: "progress", queued: 6, sent: 6, dropped: 0 };
    expect(listSendOutcomeLine(o)).toBe("Sent to all 6 people.");
  });

  it("done, singular: 'Sent to all 1 person.'", () => {
    const o: ListSendOutcome = { kind: "progress", queued: 1, sent: 1, dropped: 0 };
    expect(listSendOutcomeLine(o)).toBe("Sent to all 1 person.");
  });
});

describe("testSendOutcomeLine — the test-send button's own line, never shared with the list send's", () => {
  it("idle, sending, ok, err — the same four-state shape as the list send", () => {
    const idle: TestSendOutcome = { kind: "idle" };
    const sending: TestSendOutcome = { kind: "sending" };
    const ok: TestSendOutcome = { kind: "ok", to: "love@example.com" };
    const err: TestSendOutcome = { kind: "err", reason: "test send failed" };
    expect(testSendOutcomeLine(idle)).toBe("");
    expect(testSendOutcomeLine(sending)).toBe("Sending…");
    expect(testSendOutcomeLine(ok)).toBe("Test copy queued for love@example.com.");
    expect(testSendOutcomeLine(err)).toBe("test send failed");
  });
});

describe("pollShouldStop — the poll's own stop rule (every 15s, stop when done or after 30 min)", () => {
  const START = Date.parse("2026-09-26T12:00:00.000Z");

  it("stops the instant every queued copy has resolved (sent + dropped >= queued)", () => {
    expect(pollShouldStop(START, START + 15_000, { sent: 6, dropped: 0, queued: 6 })).toBe(true);
    expect(pollShouldStop(START, START + 15_000, { sent: 4, dropped: 2, queued: 6 })).toBe(true);
  });

  it("keeps polling while some copies are still unresolved and 30 minutes have not passed", () => {
    expect(pollShouldStop(START, START + 15_000, { sent: 3, dropped: 0, queued: 6 })).toBe(false);
    expect(pollShouldStop(START, START + 29 * 60_000, { sent: 3, dropped: 0, queued: 6 })).toBe(false);
  });

  it("stops at 30 minutes even when the send is still not fully resolved (a far-future schedule)", () => {
    expect(pollShouldStop(START, START + 30 * 60_000, { sent: 0, dropped: 0, queued: 6 })).toBe(true);
    expect(pollShouldStop(START, START + 45 * 60_000, { sent: 2, dropped: 0, queued: 6 })).toBe(true);
  });
});

describe("sendToReArm — re-arms polling after a reload (review round, item 3)", () => {
  const NOW = Date.parse("2026-09-26T12:00:00.000Z");
  function send(over: Partial<SendRecord>): SendRecord {
    return { sendId: "x", queued: 6, sent: 6, dropped: 0, segment: "all", scheduledFor: "next tick", createdAtMs: NOW, ...over };
  }

  it("no sends at all: nothing to re-arm", () => {
    expect(sendToReArm([], NOW)).toBeNull();
  });

  it("every send already done: nothing to re-arm — a frozen 'Sent to all N.' line is correct, not stale", () => {
    const sends = [send({ sendId: "a", sent: 6, dropped: 0 }), send({ sendId: "b", sent: 4, dropped: 2 })];
    expect(sendToReArm(sends, NOW)).toBeNull();
  });

  it("the newest unfinished send (still under 30 minutes old) re-arms — this is the fix: it used to never poll again after a reload", () => {
    const sends = [
      send({ sendId: "newest", sent: 2, dropped: 0, createdAtMs: NOW - 5 * 60_000 }),
      send({ sendId: "older-done", sent: 6, dropped: 0, createdAtMs: NOW - 20 * 60_000 }),
    ];
    expect(sendToReArm(sends, NOW)?.sendId).toBe("newest");
  });

  it("an unfinished send past the 30-minute stop rule is left alone — the poll's own age limit still applies after a reload", () => {
    const sends = [send({ sendId: "stale", sent: 1, dropped: 0, createdAtMs: NOW - 31 * 60_000 })];
    expect(sendToReArm(sends, NOW)).toBeNull();
  });

  it("picks the FIRST unfinished match in the given (newest-first) order — never scans past it for a better one", () => {
    const sends = [
      send({ sendId: "first-unfinished", sent: 3, dropped: 0, createdAtMs: NOW - 1 * 60_000 }),
      send({ sendId: "second-unfinished", sent: 1, dropped: 0, createdAtMs: NOW - 2 * 60_000 }),
    ];
    expect(sendToReArm(sends, NOW)?.sendId).toBe("first-unfinished");
  });
});

describe("the /a uniformity law, at the source (one state line, aria-live, error REPLACES, no em dash/arrow/emoji in a label)", () => {
  it("both status lines carry aria-live=\"polite\" and reuse kit.css's .kit-note (no per-page style object)", () => {
    expect(SRC).toContain(
      'aria-live="polite" className={testOutcome.kind === "err" ? "kit-note kit-note-err" : testOutcome.kind === "ok" ? "kit-note kit-note-ok" : "kit-note"}',
    );
    expect(SRC).toContain(
      'listOutcome.kind === "err" ? "kit-note kit-note-err" : listOutcome.kind === "queued" || listOutcome.kind === "progress" ? "kit-note kit-note-ok" : "kit-note"',
    );
  });

  it("a success state (test's ok, list's queued/progress) applies .kit-note-ok — success looks different from a failure, never muted like before (review round)", () => {
    expect(SRC).toContain('testOutcome.kind === "ok" ? "kit-note kit-note-ok"');
    expect(SRC).toContain('listOutcome.kind === "queued" || listOutcome.kind === "progress" ? "kit-note kit-note-ok"');
    // --ok clears 4.5:1 against --ground in BOTH themes (measured, WCAG
    // relative-luminance formula): dark #7fb98f/#141021 ≈ 8.21:1, dawn
    // #3c6b49/#FCF7F0 ≈ 5.81:1 — both comfortably above --err's own
    // already-shipped precedent (7.52:1 / 5.10:1) on the same ground.
  });

  it("each button's status line sits immediately after that SAME button's own markup — never the other control's", () => {
    const testBtnAt = SRC.indexOf("SEND TEST COPY");
    const testLineAt = SRC.indexOf("testSendOutcomeLine(testOutcome)");
    const listBtnAt = SRC.indexOf("SCHEDULE TO");
    const listLineAt = SRC.indexOf("listSendOutcomeLine(listOutcome)");
    expect(testBtnAt).toBeGreaterThan(-1);
    expect(testLineAt).toBeGreaterThan(testBtnAt);
    expect(testLineAt).toBeLessThan(listBtnAt); // the test line never drifts down into the list section
    expect(listLineAt).toBeGreaterThan(listBtnAt);
  });

  it("the ONE-send-per-click guard (TASK-214) still wraps both send paths", () => {
    expect(SRC).toContain("if (sendingRef.current) return; // one click in flight at a time");
    expect(SRC.match(/if \(sendingRef\.current\) return;/g)).toHaveLength(2);
  });

  it("no em dash, arrow, or emoji rides any button label or the status-line copy this lane wrote", () => {
    // the recent-sends <li> markup (item 2 of the review round: it used to
    // carry two em dashes — " · " is the house separator instead) and the
    // 409 wording (item 2's first bullet: the OLD "the list moved — it is
    // now N; retype the count" is now "The list changed. It has N people
    // now. Type N to send.") are pulled straight from the SOURCE, never
    // retyped by hand here, so a future edit that reintroduces either em
    // dash trips this guard without anyone updating a second copy of the
    // words.
    const liMatch = SRC.match(/<li key=\{s\.sendId\}[\s\S]*?<\/li>/);
    expect(liMatch, "the recent-sends <li> markup was not found at its expected shape").toBeTruthy();
    const the409Match = SRC.match(/setListOutcome\(\{ kind: "err", reason: `[^`]*\$\{d\.expected\}[^`]*` \}\);/);
    expect(the409Match, "the 409 wording was not found at its expected shape").toBeTruthy();

    const newLabelsAndCopy = [
      "SEND TEST COPY",
      "Sending…",
      "Queued for",
      "Goes out within 10 minutes.",
      "Scheduled for",
      "Mountain",
      "your time",
      "Sent to",
      "Test copy queued for",
      liMatch![0],
      the409Match![0],
    ];
    for (const s of newLabelsAndCopy) {
      expect(s, `"${s}" carries an em dash`).not.toMatch(/—/);
      expect(s, `"${s}" carries an arrow`).not.toMatch(/[→⇒➜►]/);
      expect(s, `"${s}" carries an emoji`).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it("no drain-the-queue-now fetch lives in this panel — the VPS crontab's own tick is the only drain", () => {
    expect(SRC).not.toContain("/api/mail/tick");
  });

  it("the mount effect actually calls sendToReArm and anchors pollStartRef to the send's own createdAtMs, never Date.now() at reload time", () => {
    expect(SRC).toContain("const unfinished = sendToReArm(sends, Date.now());");
    expect(SRC).toContain("pollStartRef.current = unfinished.createdAtMs;");
    expect(SRC).toContain("setActiveSendId(unfinished.sendId);");
    // the interval effect itself must never reset the anchor on a re-run —
    // that would let a reload's re-arm silently extend the 30-minute cap
    expect(SRC).not.toContain("pollStartRef.current = Date.now();");
  });
});
