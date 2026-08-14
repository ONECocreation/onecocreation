import { cartridge } from "@/brand/cartridge";

/**
 * THE STACKED HERO (the ConsciousCuts brand study, blessed 0018.05.15):
 * Love's own typographic gesture — big stacked display caps, teal second
 * voice, a serif ampersand, the emoji constellation riding beneath —
 * the glyphs come from the cartridge now (walk step 7).
 */
export default function StackedHero({
  kicker,
  lines,
  constellation,
  children,
}: {
  kicker?: string;
  lines: { t: string; tone?: "ink" | "teal" | "amp" | "sub" }[];
  constellation?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="center">
      {kicker && <p className="kicker">{kicker}</p>}
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
