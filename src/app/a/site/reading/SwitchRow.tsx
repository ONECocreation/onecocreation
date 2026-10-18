"use client";

import { Chip } from "@/components/console/glass";
import Button from "@/components/kit/Button";

/**
 * T-614 round 2 - ONE row for every on/off switch in the Weekly reading
 * card: the "Show the next reading time on the site" row (ReadingScheduleCard)
 * and the three week switches (Housewarming, Book Talk, Q&A) all draw this
 * same row: the ON lavender / OFF ghost button on the left, the bold label
 * with its quiet line after it, the status chip on the right. The Admiral:
 * "buttons should be uniform". The button is the kit Button (no raw `.btn`).
 */
export default function SwitchRow({
  on,
  label,
  quiet,
  ariaLabel,
  disabled = false,
  onFlip,
}: {
  on: boolean;
  label: string;
  /** the state line after the bold label (a busy word or a note replaces it) */
  quiet: string;
  ariaLabel: string;
  disabled?: boolean;
  onFlip: () => void;
}) {
  return (
    <div className="kit-switch-row">
      <Button
        sm
        variant="main"
        className={on ? "btn-on" : "btn-ghost"}
        aria-pressed={on}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onFlip}
      >
        {on ? "ON" : "OFF"}
      </Button>
      <div className="kit-switch-row-text">
        <b>{label}</b>
        <span>{` - ${quiet}`}</span>
      </div>
      <Chip tone={on ? "green" : "grey"}>{on ? "ON · showing" : "OFF · hidden"}</Chip>
    </div>
  );
}
