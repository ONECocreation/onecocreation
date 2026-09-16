import LettersRoom from "@/components/LettersRoom";

/**
 * LettersRoom block (TASK-296 wave B, letters-cart pair — 0018.06.25 a₿ ·
 * block ~967,200) — the RetreatsList/PackagesGrid shape (GO §2 rubric 3):
 * the reading room is a CLIENT widget fed by a SERVER-judged shelf. The
 * stored Puck doc holds only the block id; the page lists the public
 * letters fresh per request (listPublicLetters — the Letters registry) and
 * injects them at render time through applyLettersToPuck below. The member's
 * own mailbox is the widget's own client read (/api/me/letters, no-store) —
 * live in BOTH the published page and the designer canvas, never stored.
 * The injection is render-time only, never written back: the stored doc
 * never carries a letter's words (the shelf is data, never copy).
 *
 * This file rides the CLIENT bundle (puck-config.tsx imports it), so it
 * imports only the client component — never the server registry. The
 * component itself is never edited.
 */

/** One public letter, resolved server-side — plain JSON-safe props. */
export interface LettersRecentItem {
  key: string;
  subject: string;
}

/**
 * The render-time injection: every top-level LettersRoom entry in `data`
 * gains the live shelf as its `recent` prop — and NOWHERE else (other block
 * types, and a LettersRoom Love nested into a slot, are left alone; the
 * seed places the block at the root, where the room sits today). Pure; the
 * input is never mutated; nothing to inject into ⇒ the same reference
 * comes back (untouched-path law).
 */
export function applyLettersToPuck<T extends { content?: unknown[] }>(data: T, recent: LettersRecentItem[]): T {
  const current = Array.isArray(data.content) ? data.content : [];
  let touched = false;
  const content = current.map((b) => {
    const blk = b as { type?: string; props?: Record<string, unknown> };
    if (blk.type !== "LettersRoom" || !blk.props) return b;
    touched = true;
    return { ...blk, props: { ...blk.props, recent } };
  });
  return touched ? ({ ...data, content } as T) : data;
}

export function createLettersRoom() {
  return {
    label: "Letters room (live mailbox + the public shelf)",
    fields: {},
    render: ({ recent }: { recent?: LettersRecentItem[] }) => {
      /* the designer side of the glass: no injected shelf here — say so,
         never fake letters (the PackagesGrid placeholder idiom). The
         member's own mailbox still reads live in the published page. */
      if (!recent) {
        return (
          <div className="note">
            ── the live reading room: your mailbox and the recent public letters render here on the published page ──
          </div>
        );
      }
      return (
        /* the fallback's own container (src/app/letters/page.tsx's .wrap
           center 640 column) — the room's markup assumes it; at the doc
           root there is no band around the block (the bb-time lesson:
           the widget's own chrome travels WITH the block, so the
           published page and the designer canvas both wear it) */
        <div className="wrap center" style={{ maxWidth: 640, margin: "0 auto" }}>
          <LettersRoom recent={recent} />
        </div>
      );
    },
  };
}
