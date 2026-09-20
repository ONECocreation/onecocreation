import SignInCard, { KEY_EXPLAINER } from "@/components/door/SignInCard";
import BuilderMarker from "@/components/style/BuilderMarker";

/**
 * LoginDoor block (TASK-296 wave B, me-login pair — 0018.06.25 a₿; TASK-350
 * lane 2, REVIEW-K83, 0018.07.02 a₿). The stored Puck doc holds only the
 * block id (plus, from this lane on, the tab/word fields below) — the
 * block renders the real `SignInCard` in its page mount. RULED (K83,
 * decision 1 — WRAP not replace): the header's own sheet keeps mounting
 * plain `DoorSheet`, untabbed (TASK-185 Phase B's one-walk-two-mounts
 * ruling still holds for THAT mount); `/login`'s Puck-published path is the
 * one place `SignInCard` lives. The deep links ride the component itself:
 * `?next=` is read client-side (next-path.ts's nextPathFromLocation), the
 * sign-in-to-sign-up turn is the shared door-machine's own reducer — so a
 * published /login serves the same walk as before, now tabbed. The
 * component itself is never edited by this file — only imported, mounted,
 * and fed its Puck fields.
 *
 * TASK-342 (0018.06.28 a₿): wrapped in `BuilderMarker`, a no-op everywhere
 * but the /style canvas (see BuilderMarker.tsx). LoginDoor carries none of
 * MeSwitch's Fragment-collapse risk (ground fact 10) — `SignInCard` is a
 * single element — but the same wrap stays uniform across every block.
 *
 * D3 — the ask's own gap ("`fields: {}` … confirms the LoginDoor block has
 * NO editable Puck fields today"): the `form-doors.tsx`/`join-surface.tsx`
 * `fields: {...}` + `defaultProps` shape, hand-copied (RULED item 5 — no
 * new Puck-field helper arrived with the kit).
 */
interface LoginDoorProps {
  defaultTab: "email" | "key";
  emailTabLabel: string;
  keyTabLabel: string;
  keyExplainer: string;
}

export function createLoginDoor() {
  return {
    label: "Login door (SignInCard — tabbed email/key, page mount)",
    fields: {
      defaultTab: {
        type: "radio" as const,
        label: "Default tab",
        options: [
          { label: "Email", value: "email" },
          { label: "Key", value: "key" },
        ],
      },
      emailTabLabel: { type: "text" as const, label: "Email tab label" },
      keyTabLabel: { type: "text" as const, label: "Key tab label" },
      keyExplainer: { type: "text" as const, label: "Key tab explainer" },
    },
    defaultProps: {
      defaultTab: "email",
      emailTabLabel: "Email",
      keyTabLabel: "Key",
      keyExplainer: KEY_EXPLAINER,
    },
    render: ({ defaultTab, emailTabLabel, keyTabLabel, keyExplainer }: LoginDoorProps) => (
      <BuilderMarker>
        <SignInCard
          mount="page"
          defaultTab={defaultTab}
          emailTabLabel={emailTabLabel}
          keyTabLabel={keyTabLabel}
          keyExplainer={keyExplainer}
        />
      </BuilderMarker>
    ),
  };
}
