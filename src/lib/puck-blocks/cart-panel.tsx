import CartPanel from "@/components/store/CartPanel";

/**
 * CartPanel block (TASK-296 wave B, letters-cart pair — 0018.06.25 a₿ ·
 * block ~967,200) — the RetreatsList/PackagesGrid shape (GO §2 rubric 3):
 * the basket is a CLIENT widget whose price words follow SERVER-judged
 * rails (TASK-186's warm-before-you-judge: the card rail's truth is judged
 * once, server-side, per request). The stored Puck doc holds only the
 * block id; the page runs getSiteConfig() + ensureSquareVault() ahead of
 * the Puck read (the route-gate-first idiom — the SAME order the fallback
 * keeps, verbatim) and injects the rails at render time through
 * applyCartRailsToPuck below. The injection is render-time only, never
 * written back — no rail state can fossilise into a doc; the basket's
 * contents and the checkout flow live entirely in the widget and the
 * payment APIs, untouched by either branch.
 *
 * This file rides the CLIENT bundle (puck-config.tsx imports it), so it
 * imports only the client component — never the payment adapters. The
 * component itself is never edited.
 */

/** The live rails, judged server-side per request — plain JSON-safe props. */
export interface CartRails {
  btc: boolean;
  card: boolean;
}

/**
 * The render-time injection: every top-level CartPanel entry in `data`
 * gains the live rails as its `rails` prop — and NOWHERE else (other block
 * types, and a CartPanel nested into a slot, are left alone; the seed
 * places the block at the root, where the basket sits today). Pure; the
 * input is never mutated; nothing to inject into ⇒ the same reference
 * comes back (untouched-path law).
 */
export function applyCartRailsToPuck<T extends { content?: unknown[] }>(data: T, rails: CartRails): T {
  const current = Array.isArray(data.content) ? data.content : [];
  let touched = false;
  const content = current.map((b) => {
    const blk = b as { type?: string; props?: Record<string, unknown> };
    if (blk.type !== "CartPanel" || !blk.props) return b;
    touched = true;
    return { ...blk, props: { ...blk.props, rails } };
  });
  return touched ? ({ ...data, content } as T) : data;
}

export function createCartPanel() {
  return {
    label: "Cart panel (the basket — live rails)",
    fields: {},
    render: ({ rails }: { rails?: CartRails }) => {
      /* the designer side of the glass: no judged rails here — say so,
         never fake a rail state (the PackagesGrid placeholder idiom) */
      if (!rails) {
        return (
          <div className="note">
            ── the live basket: your cart and its checkout, priced on the live rails, render here on the published page ──
          </div>
        );
      }
      return (
        /* the fallback's own container (src/app/cart/page.tsx's .wrap 720
           column) — with a filled basket the panel's layout assumes it;
           the widget's own chrome travels WITH the block (the bb-time
           lesson) */
        <div className="wrap" style={{ maxWidth: 720, margin: "0 auto" }}>
          <CartPanel rails={rails} />
        </div>
      );
    },
  };
}
