import BbConsole from "@/components/BbConsole";

/**
 * BbConsole block (TASK-296 wave B, pair bb-time, 0018.06.25 a₿) — the
 * Bitcoin Buddy console as ONE data-bound block, the JoinSurface/FormDoors
 * shape (STUDIO P3): the widget is SELF-CONTAINED client machinery
 * (useMemberSession + the NIP-07 signer + localStorage buddies + the live
 * tip poll), so there is NOTHING to inject server-side and nothing to
 * fossilise — the stored doc carries only { id }, and the block renders the
 * real console everywhere it appears: the published /bb AND the designer
 * canvas. Derive-or-dash rides the widget itself (no key → its own honest
 * connect door; a dark node reads null and says so — never a fabricated
 * state). The component stays in src/components/, imported, never edited.
 */
export function createBbConsole() {
  return {
    label: "Bitcoin Buddy console (live)",
    fields: {},
    defaultProps: {},
    render: () => <BbConsole />,
  };
}
