import { bftDate } from "@/lib/bb/bft";

/**
 * A BFT date with the ₿ drawn a touch larger so it reads unmistakably as a
 * *bitcoin* date (Pac, ~0018.04.13 a₿), e.g. "0018.04.14 a₿" — marker AFTER
 * the date, and the date+marker never wraps apart (the nowrap law).
 */
export default function BftDate({ height, className }: { height: number; className?: string }) {
  const s = bftDate(height);
  const i = s.indexOf("₿");
  if (i < 0) return <span className={className} style={{ whiteSpace: "nowrap" }}>{s}</span>;
  return (
    <span className={className} style={{ whiteSpace: "nowrap" }}>
      {s.slice(0, i)}
      <span className="text-[1.2em] align-[-0.04em]">₿</span>
      {s.slice(i + 1)}
    </span>
  );
}
