"use client";

import MePanel from "./MePanel";
import EmailMemberPanel from "./EmailMemberPanel";
import MemberQuickCards from "./MemberQuickCards";
import MemberCalendar from "./MemberCalendar";
import ConstellationCard from "./ConstellationCard";
import Card from "@/components/kit/Card";
import Button from "@/components/kit/Button";
import Tabs from "@/components/kit/Tabs";
import SignInCard from "@/components/door/SignInCard";
import useMemberSession, { useSessionStatus, refresh } from "@/hooks/useMemberSession";
import { classifyMeState } from "./session-state";

/**
 * Two kinds of member, one /me (dual-path ruling): key members get the full
 * nostr control room; email members get their own home — no key demanded.
 *
 * TASK-351 (OC UI kit lane 3, REVIEW-K83 folded — decision 4(a) taken):
 * reads the SHARED `useMemberSession()` store instead of running its own
 * duplicate fetch — one session source with the header (`DoorButton`) and
 * `MePanel`, three lanes before lane 5 gets there on its own. Four honest
 * states now (Ground: there was no signed-out state at all before this
 * lane — a true 401 and a genuine fetch failure both fell into the same
 * "assume key" branch):
 *   loading     — a real "checking…" beat, `aria-busy`, never a blank flash
 *   error       — the CHECK ITSELF failed (network/5xx) — plain words +
 *                 Retry; the sign-in card stays one glance away, never a
 *                 dead end
 *   signed-out  — a real 401: the sign-in card ALONE, nothing else beside it
 *   email / key — today's existing signed-in views, unchanged
 * `classifyMeState` (session-state.ts) is the one place this decision is
 * made — a sibling module the hook's own fetch handling shares — pinned
 * directly in tests/me-signed-out.test.ts.
 *
 * TASK-352 (OC UI kit lane 4): the "email"/"key" branches below are now
 * three kit `Tabs` — Profile, Calendar, Purchases — each branch wiring its
 * own `items` (RULED, Build item 1, option (b): matches this file family's
 * existing separation — EmailMemberPanel/MePanel/MemberQuickCards/
 * ConstellationCard never share a file today). Tab state is uncontrolled
 * (`defaultActive`, RULED, Build item 2) — no URL param, no new plumbing.
 * Calendar mounts today's real `MemberCalendar` (`/api/member/bookings`)
 * unmodified for BOTH kinds — the one genuinely new fetch this lane adds
 * (an email member never had a calendar surface on /me before). Purchases
 * mounts `MemberQuickCards` for BOTH kinds (RULED, Build item 6) — an email
 * member gains its state chips and Matrix classroom links, a real, named
 * superset of what `EmailMemberPanel` used to render alone. "Link a key" is
 * OUT of this lane entirely (RULED, the Admiral) — nothing built for it.
 */
export default function MeSwitch() {
  const { checked } = useMemberSession();
  const { status } = useSessionStatus();
  const kind = classifyMeState({ checked, status });

  if (kind === "loading") {
    return (
      <Card aria-busy="true" role="status" style={{ minHeight: 320 }}>
        <p className="kit-body" style={{ margin: 0 }}>
          Checking your session…
        </p>
      </Card>
    );
  }

  if (kind === "error") {
    return (
      <>
        <Card role="alert" style={{ marginBottom: 16 }}>
          <p className="kit-body" style={{ marginBottom: 12 }}>
            couldn&apos;t check your session — try again
          </p>
          <Button variant="second" sm onClick={refresh}>
            Retry
          </Button>
        </Card>
        <SignInCard mount="page" />
      </>
    );
  }

  if (kind === "signed-out") return <SignInCard mount="page" />;

  if (kind === "email") {
    return (
      <Tabs
        label="Your account"
        defaultActive="profile"
        items={[
          { id: "profile", label: "Profile", content: <EmailMemberPanel /> },
          { id: "calendar", label: "Calendar", content: <MemberCalendar /> },
          { id: "purchases", label: "Purchases", content: <MemberQuickCards /> },
        ]}
      />
    );
  }

  return (
    <Tabs
      label="Your account"
      defaultActive="profile"
      items={[
        {
          id: "profile",
          label: "Profile",
          content: (
            <>
              {/* the same gentle stars the email home greets with (Admiral, 0018.05.15) */}
              <ConstellationCard />
              <MePanel />
            </>
          ),
        },
        { id: "calendar", label: "Calendar", content: <MemberCalendar /> },
        { id: "purchases", label: "Purchases", content: <MemberQuickCards /> },
      ]}
    />
  );
}
