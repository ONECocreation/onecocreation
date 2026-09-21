"use client";

import Link from "next/link";
import useMemberSession from "@/hooks/useMemberSession";
import { ABOUT_PINK_DOOR } from "@/lib/about-content";

/**
 * AccountDoor (TASK-355, 0018.07.02 a₿) — the Admiral's own site walk: "at
 * the bottom of the about section there is a create your account button.
 * i'm signed in, not sure we should see it that way if the site knows i'm
 * signed in." RULED D2(a): signed in → "Go to your page →" to `/me`;
 * signed out → the original "Create your account ✨" to `/welcome`,
 * unchanged. No flash of either door: `useMemberSession` starts
 * `checked:false` on both server and client, so this renders the SAME
 * `—` idiom `src/components/welcome/WelcomeFlow.tsx` uses (anchor
 * `{!checked && (`) while the first session answer is in flight — never
 * the signed-out door first, then a swap once the real answer lands.
 *
 * The class stays `ABOUT_PINK_DOOR` (`"btn btn-rose"`, single-sourced in
 * `@/lib/about-content`) — pinned by `tests/about-copy.test.ts` and
 * `tests/pink-shimmer-doors.test.ts`.
 */
export default function AccountDoor() {
  const { member, checked } = useMemberSession();

  if (!checked) {
    return <p style={{ fontSize: ".85rem", color: "var(--muted)", margin: 0 }}>—</p>;
  }

  if (member) {
    return (
      <Link className={ABOUT_PINK_DOOR} href="/me">
        Go to your page →
      </Link>
    );
  }

  return (
    <Link className={ABOUT_PINK_DOOR} href="/welcome">
      Create your account ✨
    </Link>
  );
}
