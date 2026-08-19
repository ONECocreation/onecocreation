import JoinSurfaceView from "./JoinSurfaceView";

/**
 * JoinSurface (STUDIO P3, ALT-2A ruled — kit-level block in THIS repo;
 * upstreaming to puck-studio is a P5 hand-off): the Join surface as ONE
 * editable block, binding the claim machinery that already exists —
 * TagClaim (the claim flow), the Doors (SignerDoors + EmailDoor), the
 * brand contract (the root BrandProvider's theme reaches every bound
 * piece; nothing here re-themes). Not new machinery — a binding.
 *
 * The surface's promise is the P3-ruled sentence, verbatim and
 * non-negotiable — it lives in the view as ONE unsplit string and is NOT
 * a field, so it cannot drift in the editor. The surface says nothing
 * else about anchoring (operator-side, never in-page or automatic),
 * fees, or speed — those are the ruled blockers.
 *
 * The pitch copy (claim button + subline, letters button) is a FIELD with
 * onecocreation's quieter voice as its default — Pac's FREE ruling
 * (0018.05.26): the name being free is frens.earth's pitch, not something
 * onecocreation announces. The machinery's own defaults keep frens.earth's
 * wording; this surface simply never asks for it.
 *
 * Doors-panel connection states are live-or-dashes (the honest-time law
 * applied to connection state): the one state shown — signer-extension
 * presence — is a live client read, a dash until it answers.
 *
 * Kind0Doors is deliberately NOT bound: its prepare/submit contract
 * serves profile publishing, which TagClaim's success step already
 * covers for forged keys — a standalone publish door here would be a
 * fake door. Anything deeper than the surface (the new-key → claim
 * welcome hand-off LoginPanel owns) stays // coordinator.
 */

interface JoinSurfaceProps {
  heading: string;
  claim: "yes" | "no";
  doors: "yes" | "no";
  forms: "yes" | "no";
  claimCta: string;
  claimSubline: string;
  subscribeCta: string;
}

export function createJoinSurface(opts: { space: string; nip05Domain: string }) {
  return {
    label: "Join surface (claim + doors)",
    fields: {
      heading: { type: "text" as const, label: "Heading" },
      claim: {
        type: "radio" as const,
        label: "Name-claim machine",
        options: [
          { label: "On", value: "yes" },
          { label: "Off", value: "no" },
        ],
      },
      doors: {
        type: "radio" as const,
        label: "Returning-member doors (key + email)",
        options: [
          { label: "On", value: "yes" },
          { label: "Off", value: "no" },
        ],
      },
      forms: {
        type: "radio" as const,
        label: "Letters + contact doors",
        options: [
          { label: "On", value: "yes" },
          { label: "Off", value: "no" },
        ],
      },
      claimCta: { type: "text" as const, label: "Claim button label" },
      claimSubline: { type: "text" as const, label: "Claim subline" },
      subscribeCta: { type: "text" as const, label: "Letters button label" },
    },
    defaultProps: {
      /* onecocreation's quieter voice — no FREE pitch on this surface */
      heading: "Join the field",
      claim: "yes",
      doors: "yes",
      forms: "yes",
      claimCta: "CLAIM YOUR TAG",
      claimSubline: "No email, no password, no account — your keys are your login.",
      subscribeCta: "Send my meditation",
    },
    render: ({ heading, claim, doors, forms, claimCta, claimSubline, subscribeCta }: JoinSurfaceProps) => (
      <JoinSurfaceView
        heading={heading}
        space={opts.space}
        nip05Domain={opts.nip05Domain}
        claim={claim === "yes"}
        doors={doors === "yes"}
        forms={forms === "yes"}
        claimCta={claimCta}
        claimSubline={claimSubline}
        subscribeCta={subscribeCta}
      />
    ),
  };
}
