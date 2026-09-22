"use client";

import { useReducer, useState } from "react";
import Link from "next/link";
import Card from "@/components/kit/Card";
import Field from "@/components/kit/Field";
import Button from "@/components/kit/Button";
import useMemberSession from "@/hooks/useMemberSession";
import type { NoticeState } from "./ReadingNotice";
import {
  classifySignUpKind,
  reduceSubmit,
  INITIAL_SUBMIT_STATE,
  type ReadingTagOutcome,
  type SignUpKind,
} from "./reading-sign-up-state";

/**
 * TASK-388 (block 968,088) — THE READING SIGN-UP BLOCK, mounted inside
 * `ReadingNotice` (decision A): a member's one-tap "count me in," tagging
 * their OWN email `reading` through the subscribers rail's narrow seam
 * (`addReadingTag`, `subscribers.ts`) — never a second door past the
 * room's own free members-only gate (Builder must NOT). A key-signed
 * member (no email on file, decision B) gets the email field instead of a
 * silent skip. The signed-out state (email field + the `/news` letters
 * door) is carried for this component's FUTURE public mounts (TASK-391)
 * — the reading room itself is members-only, so signed-out visitors never
 * see it rendered from here (Ground).
 *
 * Sends NO confirmation letter (decision C) — "You're on the list for the
 * reading." is the whole of the success copy; TASK-389 is the next lane
 * that adds the letter and changes this one line.
 *
 * Zero clock/timer/schedule reads here — `state` is the ONLY prop, handed
 * down from `ReadingNotice`'s own already-computed `NoticeState` (What
 * this lane is NOT).
 *
 * Every `Button` below carries `sm` — `SignInCard.tsx`'s own send-back
 * note (TASK-356) measured `kit-btn-main`'s unmodified size (`kit.css`'s
 * fixed 1.5rem/40px-padding/nowrap law, R-071) clipping at 390px even for
 * "EMAIL ME A CODE" (16 characters); this block's longest label, "Count me
 * in for the weekly reading" (34 characters), would clip harder still.
 * `kit.css` itself is READ-ONLY for this lane, so `sm` — composing onto
 * `kit-btn-main` by design (kit.css's own doc comment) — is the same fix
 * that lane already proved, not a new one.
 *
 * TWO components, on purpose: `ReadingSignUp` (default) calls the real
 * `useMemberSession()` hook, so `<ReadingSignUp>` is what `ReadingNotice`
 * mounts. `ReadingSignUpCard` (named) is the pure presentation over an
 * explicit `kind`/`memberEmail` pair, with no hook of its own — this
 * repo's `vitest.config.ts` runs no jsdom, and `react-dom/server`'s
 * `useSyncExternalStore` resolves to the hook's OWN `getServerSnapshot`
 * (`checked: false, member: null`) under `renderToStaticMarkup`, the same
 * way it does for every other `useMemberSession()` consumer in this tree
 * (Ground: no test in this repo renders a live `useMemberSession()`
 * caller and expects a signed-in branch from it — `tests/
 * me-signed-out.test.ts` pins `MeSwitch`'s signed-in branches by SOURCE
 * STRING for exactly this reason). Exporting the presentational half lets
 * `tests/reading-sign-up.test.ts` render all three real states directly.
 */

/** Decision C, verbatim: "You're on the list for the reading." — no
 *  "watch for the letter" promise this lane can't keep (this branch sends
 *  none). Exported so the exact string is pinned directly, not only via a
 *  render a test would have to drive a reducer through first. */
export const OUTCOME_COPY: Record<ReadingTagOutcome, string> = {
  joined: "You're on the list for the reading.",
  already: "You're already in.",
  unsubscribed: "You unsubscribed earlier, so this can't quietly add you back.",
};

const GENERIC_ERROR = "Something went sideways — please try again.";

/** Exported for its own direct tests (the honest outcomes a real fetch,
 *  a non-2xx with a reason, and a thrown/network failure each resolve
 *  to) — separate from `reduceSubmit`, which only pins what the MACHINE
 *  does once handed an already-classified event. */
export async function postReadingSignUp(
  email: string,
): Promise<{ ok: true; outcome: ReadingTagOutcome } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "reading" }),
    });
    let data: { ok?: boolean; outcome?: string; reason?: string } | null = null;
    try {
      data = await res.json();
    } catch {
      /* an empty/non-JSON body falls through to the generic error below */
    }
    if (!res.ok || !data?.ok) return { ok: false, message: data?.reason ?? GENERIC_ERROR };
    const outcome: ReadingTagOutcome =
      data.outcome === "already" || data.outcome === "unsubscribed" ? data.outcome : "joined";
    return { ok: true, outcome };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

/** The three real render kinds — never `"loading"`, which `ReadingSignUp`
 *  itself renders `null` for, before this ever mounts (Ground, see the
 *  module docblock above for why this is a NAMED export). */
export function ReadingSignUpCard({
  kind,
  memberEmail,
}: {
  kind: Exclude<SignUpKind, "loading">;
  memberEmail: string | null;
}) {
  const [email, setEmail] = useState("");
  const [submit, dispatch] = useReducer(reduceSubmit, INITIAL_SUBMIT_STATE);

  async function submitEmail(addr: string) {
    if (submit.kind === "pending") return; // duplicate-click suppression
    dispatch({ type: "submit" });
    const result = await postReadingSignUp(addr);
    dispatch(
      result.ok ? { type: "success", outcome: result.outcome } : { type: "failure", message: result.message },
    );
  }

  if (submit.kind === "done") {
    return (
      <Card>
        <div className="center kit-stack">
          <p className="kit-h2">Hold your seat.</p>
          <p>{OUTCOME_COPY[submit.outcome]}</p>
        </div>
      </Card>
    );
  }

  if (kind === "member" && memberEmail) {
    return (
      <Card>
        <div className="center kit-stack">
          <p className="kit-h2">Hold your seat.</p>
          {/* the plain wrapper is the fix: .kit-stack is a flex column with
              no align-items rule, so its default align-items:stretch was
              stretching the <button> flex-item itself to the card's full
              width (959px at 1440, the Chrome walk's own catch) — a bare
              block div takes the stretch instead, and the inline-block
              Button inside it centres on the inherited .center text-align */}
          <div>
            <Button onClick={() => submitEmail(memberEmail)} disabled={submit.kind === "pending"} sm>
              {submit.kind === "pending" ? "Counting you in…" : "Count me in for the reading"}
            </Button>
          </div>
          {submit.kind === "error" && <p className="kit-field-error">{submit.message}</p>}
          <p className="kit-text-quiet">Free for every member — no extra letters, just your seat.</p>
        </div>
      </Card>
    );
  }

  // member-key and guest both need a typed email — decision B: a
  // key-signed member gets the field, never a silent skip.
  return (
    <Card>
      <form
        className="center kit-stack"
        onSubmit={(e) => {
          e.preventDefault();
          submitEmail(email);
        }}
      >
        <p className="kit-h2">Hold your seat.</p>
        <Field
          id="reading-sign-up-email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={submit.kind === "error" ? submit.message : undefined}
        />
        {/* same fix as the member branch's button — see its comment above.
            The Field above is left unwrapped: kit-field's own max-width:
            360px (kit.css) already caps it well under the ~420px stretch
            concern, so the stretched flex-item never actually renders past
            360px wide regardless of the card's own width. */}
        <div>
          <Button type="submit" disabled={submit.kind === "pending"} sm>
            {submit.kind === "pending"
              ? "Joining…"
              : kind === "member-key"
                ? "Count me in for the reading"
                : "Join the weekly reading"}
          </Button>
        </div>
        <p className="kit-text-quiet">
          {kind === "member-key"
            ? "Your key doesn't carry an email on file — leave one here for the reading list."
            : "Free once you're signed in — leave your email to hold your seat."}
        </p>
        {/* the letters door — signed-out visitors ONLY (Build step 1): a
            key-signed member is already a member and never sees this line */}
        {kind === "guest" && (
          <p className="kit-text-quiet">
            Already getting our letters? Find them at <Link href="/news">News &amp; Letters</Link>.
          </p>
        )}
      </form>
    </Card>
  );
}

export default function ReadingSignUp({ state }: { state: NoticeState }) {
  const { member, checked } = useMemberSession();

  if (state.kind === "off") return null;

  const kind = classifySignUpKind({ checked, member: member ? { space: member.space } : null });
  if (kind === "loading") return null; // Ground: never flash the form before the session resolves

  return <ReadingSignUpCard kind={kind} memberEmail={kind === "member" && member ? member.handle : null} />;
}
