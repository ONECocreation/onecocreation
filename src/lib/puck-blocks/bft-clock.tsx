import TimeClock from "@/app/time/TimeClock";

/**
 * BftClock block (TASK-296 wave B, pair bb-time, 0018.06.25 a₿) — /time's
 * live BFT read as a data-bound block, landing T-295 pair 6's ruled
 * flag-and-stop. The reading is CLIENT-live (TimeClock polls
 * currentBlockInfo on the house 60s cadence, live-or-dashes — the
 * 0018.05.26 a₿ ruling: SSR emits the dashes, hydration fills), so there is
 * NOTHING to inject server-side and nothing to fossilise: the stored doc
 * carries only { id }, and the block renders the real clock everywhere it
 * appears — the published /time AND the designer canvas. TimeClock stays in
 * src/app/time/, imported where it is, never edited (moving it is a
 * src/components question — not this lane).
 */
export function createBftClock() {
  return {
    label: "BFT Clock (live)",
    fields: {},
    defaultProps: {},
    render: () => <TimeClock />,
  };
}
