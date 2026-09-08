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
 */
const OPTIONS: { id: RoomVantage; label: string }[] = [
  { id: "stage", label: "Stage" },
  { id: "lesson", label: "Lesson Path" },
  { id: "circle", label: "The Circle" },
];

export default function VantageSwitcher() {
  const [vantage, setVantage] = useRoomVantage();
  return (
    <div className="cls-vantage" role="group" aria-label="how you'd like to see this room">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className="btn btn-sm"
          aria-pressed={vantage === o.id}
          style={
            vantage === o.id
              ? { background: "linear-gradient(135deg,var(--gold-2),var(--gold))", color: "var(--gold-ink)", borderColor: "var(--gold-deep)" }
              : undefined
          }
          onClick={() => setVantage(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
