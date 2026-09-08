import JoinSurfaceView from "./JoinSurfaceView";

/**
 * JoinSurface (STUDIO P3, ALT-2A ruled — kit-level block in THIS repo;
 * upstreaming to puck-studio is a P5 hand-off): the Join surface as ONE
 * editable block. TASK-185 Phase B (the Admiral's ruling 2, 0018.06.18
 * a₿): the bound claim machine (TagClaim) and the embedded doors
 * (SignerDoors + EmailDoor) are retired — the block's claim/doors sections
 * now ride the front door (one door to /login; the sheet signs a soul in
 * and turns into sign-up on its own). The letters + contact doors stay.
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
 * onecocreation announces. The door sheet's own voice carries the walk
 * from /login onward.
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
        label: "Join door (rides the front door's sheet)",
        options: [
          { label: "On", value: "yes" },
          { label: "Off", value: "no" },
        ],
      },
      doors: {
        type: "radio" as const,
        label: "Returning-member door (rides the front door's sheet)",
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
      claimCta: "Claim your name",
      claimSubline: "One short walk — an email code or your key — and the name is yours.",
      subscribeCta: "Send my meditation",
    },
    render: ({ heading, claim, doors, forms, claimCta, claimSubline, subscribeCta }: JoinSurfaceProps) => (
      <JoinSurfaceView
        heading={heading}
        space={opts.space}
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
