import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import OperatorGate from "@/components/OperatorGate";
import { operatorFromCookieHeader, operatorsConfigured } from "@/lib/operator-auth";
import { safeNextPath } from "@/lib/next-path";
import { DOORS } from "../../rooms-config";
import GoRoom from "./GoRoom";

/**
 * `/a/site/reading/go/<door>` — Love's one-tap email link (TASK-486,
 * block 968,624+). Same server gate-wrapper shape as every other `/a`
 * room (`a-site-rooms-wear-the-gate.test.ts`'s own five siblings, `/a/
 * studio/room/[room]/page.tsx`'s nested-dynamic-route precedent): no
 * operator cookie, `<OperatorGate />` renders instead of the room, and a
 * nested route inherits nothing from `/a/site/reading/page.tsx` above it
 * — this page reads the cookie itself.
 *
 * TWO checks, in this order:
 *  1. the `door` param against `DOORS` (`../../rooms-config.ts`'s own
 *     config, the one source of truth) — an unknown door 404s BEFORE any
 *     cookie read, same as an unknown room 404s for `/a/studio/room/
 *     [room]` (T-306);
 *  2. the operator cookie — signed out gets `<OperatorGate>` with a
 *     `next` back to THIS exact address (`safeNextPath`, T-442) so an
 *     email link that lands her at `/login` first still finishes here,
 *     instead of the door's plain "come back here" words.
 *
 * SAFE TO PREFETCH: this is a plain server component that reads a
 * cookie and renders a child — it makes no fetch of its own, GET or PUT.
 * `GoRoom`'s own `useDoorRoom` hook does one GET on client mount (the
 * room's current phase, the same read `RoomsCard.tsx` polls with) —
 * never a PUT. Only a button press (`onOpenAndJoin`/`onClose`) ever
 * calls `openDoor`/`closeDoor`.
 *
 * BLOCKER FIX (block 968,624+, a real `next build`+`next start` Chrome
 * walk): `DOORS` used to import from `RoomsCard.tsx`, a CLIENT module —
 * on the server that import is an opaque client reference, not the real
 * array, and `.find()` on it 500'd. `DOORS` now imports from
 * `../../rooms-config.ts`, a plain module with no client directive,
 * safe on either side of the boundary.
 */
export const metadata: Metadata = {
  title: "Open the room — admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function GoDoorPage({ params }: { params: Promise<{ door: string }> }) {
  const { door: doorId } = await params;
  const door = DOORS.find((d) => d.id === doorId);
  if (!door) notFound();

  const cookie = (await headers()).get("cookie");
  const operator = operatorFromCookieHeader(cookie);
  if (!operator) {
    const next = safeNextPath(`/a/site/reading/go/${door.id}`);
    return <OperatorGate configured={operatorsConfigured()} next={next} />;
  }

  return <GoRoom door={door} />;
}
