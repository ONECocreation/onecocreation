import { cartridge } from "@/brand/cartridge";

/**
 * THE STACKED HERO (the ConsciousCuts brand study, blessed 0018.05.15):
 * Love's own typographic gesture — big stacked display caps, teal second
 * voice, a serif ampersand, the emoji constellation riding beneath —
 * the glyphs come from the cartridge now (walk step 7).
 *
 * TASK-216 (0018.06.23 a₿, #39 — one header treatment): the top hero band
 * on every page converges HERE. Eight pages used to hand-roll this exact
 * markup (kicker + h1.stack-hero spans + constellation) instead of calling
 * this component — "pages keep their own titles, never their own header
 * chrome". `tone: "rose"` and `kickerTone` carry the few pages whose title
 * wants the rose family instead of the default ink/teal split — a named
 * rule (house.css's `.sh-rose`/`.kicker-teal`), not a copy of the markup
 * with an inline color.
 */
export default function StackedHero({
  kicker,
  kickerTone,
  lines,
  constellation,
  children,
}: {
  kicker?: string;
  /** default (unset) is the CSS default — --rose — so most pages never pass this */
  kickerTone?: "teal";
  lines: { t: string; tone?: "ink" | "teal" | "amp" | "sub" | "rose" }[];
  constellation?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="center">
      {kicker && <p className={`kicker${kickerTone ? ` kicker-${kickerTone}` : ""}`}>{kicker}</p>}
      <h1 className="stack-hero">
        {lines.map((l, i) => (
          <span key={i} className={`sh-${l.tone ?? "ink"}`}>{l.t}</span>
        ))}
      </h1>
      {constellation && <div className="constellation" aria-hidden>{cartridge.constellation}</div>}
      {children}
    </div>
  );
}
