import AccountDoor from "@/components/AccountDoor";
import BuilderMarker from "@/components/style/BuilderMarker";

/**
 * AccountDoor block (TASK-355, 0018.07.02 a₿, REVIEW-K86 item 3) — the
 * CURRENT `login-door.tsx`/`me-switch.tsx` factory shape (`createXxx()`
 * returning `{ label, fields, render }`), NOT the pre-T-350 bare `{ id }`
 * shape an earlier draft of the brief still cited. The stored Puck doc
 * holds only the block id; the block renders the real, session-aware
 * `AccountDoor` component on the published page AND the designer canvas.
 * No Puck fields — the door's words and hrefs are fixed by the Admiral's
 * ruling (D2a), not editable copy.
 *
 * Wrapped in `BuilderMarker`, a no-op everywhere but the /style canvas
 * (see BuilderMarker.tsx) — the same wrap `MeSwitch`/`LoginDoor` carry, for
 * a uniform builder-preview label across every session-aware block.
 */
export function createAccountDoor() {
  return {
    label: "Account door (Create your account / Go to your page — session-aware)",
    fields: {},
    render: () => (
      <BuilderMarker>
        <AccountDoor />
      </BuilderMarker>
    ),
  };
}
