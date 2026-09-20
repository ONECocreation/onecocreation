"use client";

import { useId, useRef, useState } from "react";

/**
 * kit Tabs (TASK-349) — new construction, not an extraction (Ground: `grep
 * -rn 'role="tab' src tests` returns nothing; MeSwitch is a plain
 * button-toggle, not a tablist). Real `role="tablist"`/`role="tab"`/
 * `role="tabpanel"`, a stable id/aria-controls pairing per tab, roving
 * tabindex, and left/right + up/down + Home/End arrow-key movement.
 *
 * Named decision 2: uncontrolled by default (`defaultActive`, internal
 * state) with an optional controlled override (`active`/`onChange`) — the
 * most reusable shape for lane 4's real Tabs migration.
 *
 * The selected tab carries TWO cues, never color alone: font-weight 700
 * AND the underline (kit.css `.kit-tab-active`) — a grayscale render still
 * shows which tab is active.
 *
 * `nextTabIndex` is exported pure so the arrow-key law is testable without
 * a DOM (this repo's vitest config runs `environment: "node"`, no jsdom —
 * see tests/operator-gate-email-seat.test.ts's note on the house
 * read-the-source convention).
 */
export function nextTabIndex(current: number, key: string, count: number): number {
  if (count <= 0) return current;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return current;
  }
}

export interface KitTabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface KitTabsProps {
  items: KitTabItem[];
  /** controlled: the active tab id. Omit for uncontrolled. */
  active?: string;
  /** uncontrolled: the initial active tab id (default: the first item). */
  defaultActive?: string;
  onChange?: (id: string) => void;
  /** aria-label for the tablist container. */
  label?: string;
}

export default function Tabs({ items, active, defaultActive, onChange, label = "Tabs" }: KitTabsProps) {
  const baseId = useId();
  const isControlled = active !== undefined;
  const [internalActive, setInternalActive] = useState<string | undefined>(defaultActive ?? items[0]?.id);
  const activeId = isControlled ? active : internalActive;
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function select(id: string) {
    if (!isControlled) setInternalActive(id);
    onChange?.(id);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const nextIndex = nextTabIndex(activeIndex, event.key, items.length);
    if (nextIndex === activeIndex) return;
    event.preventDefault();
    const nextItem = items[nextIndex];
    select(nextItem.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="kit-tabs">
      <div role="tablist" aria-label={label} className="kit-tabs-list" onKeyDown={handleKeyDown}>
        {items.map((item, index) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? "kit-tab kit-tab-active" : "kit-tab"}
              onClick={() => select(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={`${baseId}-panel-${item.id}`}
            aria-labelledby={`${baseId}-tab-${item.id}`}
            hidden={!selected}
            tabIndex={0}
            className="kit-tab-panel"
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
