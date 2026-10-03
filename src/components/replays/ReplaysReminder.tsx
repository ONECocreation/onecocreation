"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/kit/Button";
import ReadingSignInBox from "@/components/rooms/ReadingSignInBox";

/**
 * TASK-546 - /replays' "Want a reminder email?" opens the reading mailing
 * list box RIGHT THERE, in place: no navigation, no scroll jump (it used to
 * link to /reading#keep-posted). The box is the SAME component /reading
 * mounts (ReadingSignInBox), so the same routes, the same code step, the
 * same words, the same rate limits and the same `reading` tag
 * (postReadingSignUp posts source "reading", the route calls addReadingTag)
 * apply. A signed-in member sees that box's own returning-member card.
 *
 * The button keeps its words and is a disclosure: aria-expanded +
 * aria-controls, pressing it again folds the box away. Opening moves focus
 * to the first control in the box (the email field, or the member's Keep me
 * posted button). Focus is moved with preventScroll, so nothing jumps.
 */
export default function ReplaysReminder() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let tries = 0;
    let frame = 0;
    /* the box renders nothing until the member session resolves, so look
       again for a few frames before giving up */
    const focusFirst = () => {
      const target = panel.current?.querySelector<HTMLElement>("input, button:not([disabled])");
      if (target) target.focus({ preventScroll: true });
      else if (tries++ < 60) frame = requestAnimationFrame(focusFirst);
    };
    focusFirst();
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <>
      <div className="kit-btn-row kitx-actions">
        <Button
          variant="second"
          sm
          aria-expanded={open}
          aria-controls="replays-reminder"
          onClick={() => setOpen((v) => !v)}
        >
          Want a reminder email?
        </Button>
      </div>
      <div id="replays-reminder" ref={panel} hidden={!open}>
        {open && <ReadingSignInBox />}
      </div>
    </>
  );
}
