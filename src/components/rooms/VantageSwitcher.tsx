"use client";

import { useRoomVantage, type RoomVantage } from "./vantage";

/**
 * The member-facing vantage control — ONE tab row, the three rooms the
 * Admiral ruled (TASK-184, 0018.06.18 a₿): **Stage · Lesson Path · The
 * Circle**, in this order, quiet near the room header — not a hero. The
 * retired four (Sanctuary / Video / Materials / People) no longer list;
 * a member's stale stored pick resolves to the Stage in vantage.ts
 * (`resolveVantage`), never to a dead tab. Drives `useRoomVantage`'s
 * shared, per-user persisted state.
 *
 * TASK-465 (block 968,561): "it will replace that stage button title
 * called the playground" — the Playground room's OWN Stage tab reads "The
 * Playground" instead of the plain "Stage" word; every other room keeps
 * "Stage". The smallest seam: an optional `stageLabel` prop, passed only
 * by the mount that knows which room this is (ClassroomView.tsx, keyed off
 * `reading-room.ts`'s `PLAYGROUND_ROOM_SLUG`) — this file stays room-blind.
 */
const OPTIONS: { id: RoomVantage; label: string }[] = [
  { id: "stage", label: "Stage" },
  { id: "lesson", label: "Lesson Path" },
  { id: "circle", label: "Events" }, // TASK-211 (0018.06.23 a₿, Love's call #31) renamed this tab
];

export default function VantageSwitcher({ stageLabel }: { stageLabel?: string } = {}) {
  const [vantage, setVantage] = useRoomVantage();
  return (
    <div className="cls-vantage" role="group" aria-label="how you'd like to see this room">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`btn btn-sm btn-ghost${vantage === o.id ? " btn-on" : ""}`}
          aria-pressed={vantage === o.id}
          onClick={() => setVantage(o.id)}
        >
          {o.id === "stage" && stageLabel ? stageLabel : o.label}
        </button>
      ))}
    </div>
  );
}
