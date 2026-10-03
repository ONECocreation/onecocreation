"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/kit/Button";
import Field from "@/components/kit/Field";
import useMemberSession from "@/hooks/useMemberSession";
import { postReadingSignUp, OUTCOME_COPY } from "@/components/rooms/ReadingSignUp";
import type { ReadingTagOutcome } from "@/components/rooms/reading-sign-up-state";

/**
 * TASK-546 r2 - /replays' "Want a reminder email?" is a plain mailing-list
 * sign-up, not a sign-in. No code, no account, no page change.
 *
 * Signed out: the button opens one Email field + one button in place and
 * the email goes straight to the reading list through postReadingSignUp
 * (POST /api/subscribe, source "reading", so the subscriber carries the
 * `reading` tag). Signed in with an email on the account: ONE click, the
 * member's own email subscribes at once. A key-only member (no email on
 * file) gets the field. Success is one quiet line in place.
 *
 * The button is a disclosure (aria-expanded, aria-controls). Opening moves
 * focus to the field with preventScroll, so nothing jumps.
 */
const QUIET_LINE = "A reminder the morning of each reading, and Love's letters when something fun is on.";
const BUSY = "Keeping you posted…";

type Phase =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; outcome: ReadingTagOutcome }
  | { kind: "error"; message: string };

export default function ReplaysReminder() {
  const { member, checked } = useMemberSession();
  const memberEmail = checked && member && member.space === "email" ? member.handle : null;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const panel = useRef<HTMLDivElement>(null);

  async function subscribe(addr: string) {
    if (phase.kind === "pending") return;
    setPhase({ kind: "pending" });
    const result = await postReadingSignUp(addr);
    setPhase(result.ok ? { kind: "done", outcome: result.outcome } : { kind: "error", message: result.message });
  }

  function press() {
    const next = !open;
    setOpen(next);
    // one click for a member with an email on file
    if (next && memberEmail && (phase.kind === "idle" || phase.kind === "error")) void subscribe(memberEmail);
  }

  const showField = open && !memberEmail && phase.kind !== "done";

  useEffect(() => {
    if (!showField) return;
    panel.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
  }, [showField]);

  return (
    <>
      <div className="kit-btn-row kitx-actions">
        <Button variant="second" sm aria-expanded={open} aria-controls="replays-reminder" onClick={press}>
          Want a reminder email?
        </Button>
      </div>
      <div id="replays-reminder" ref={panel} hidden={!open}>
        {open && (
          <div className="kit-stack">
            {phase.kind === "done" ? (
              <p className="kit-text-quiet" role="status">
                {OUTCOME_COPY[phase.outcome]}
              </p>
            ) : (
              <>
                {!memberEmail && <p className="kit-text-quiet">{QUIET_LINE}</p>}
                {memberEmail ? (
                  <p className="kit-text-quiet" role="status">
                    {phase.kind === "error" ? phase.message : BUSY}
                  </p>
                ) : (
                  <form
                    className="kit-inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void subscribe(email.trim());
                    }}
                  >
                    <Field
                      id="replays-reminder-email"
                      label="Email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={phase.kind === "error" ? phase.message : undefined}
                    />
                    <Button type="submit" disabled={phase.kind === "pending"} sm>
                      {phase.kind === "pending" ? BUSY : "Keep me posted"}
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
