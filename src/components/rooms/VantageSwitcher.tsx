"use client";

import { useRoomVantage, type RoomVantage } from "./vantage";

/**
 * The member-facing vantage control (loves-desk-and-classroom-plan.md,
 * "The Classroom Four"): Sanctuary · Lesson Path · The Circle, quiet, near
 * the room header — not a hero. Drives `useRoomVantage`'s shared, per-user
 * persisted state.
 */
const OPTIONS: { id: RoomVantage; label: string }[] = [
  { id: "sanctuary", label: "Sanctuary" },
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
