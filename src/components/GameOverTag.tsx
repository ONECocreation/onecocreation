import Link from "next/link";

/**
 * GAME OVER as an invitation, not an ending: no fren holds this tag, so it
 * might be free — press start and take it. The registration link pre-fills
 * the searched tag. Reserved names get the honest version instead of a
 * "might be free" promise the claim API would immediately break.
 */
export default function GameOverTag({
  handle,
  spaceTag,
  registerHref,
  reserved,
  elsewhereSpace = null,
}: {
  handle: string;
  spaceTag: string;
  registerHref: string;
  reserved: boolean;
  /** The tag exists behind another door — offer it before selling a claim */
  elsewhereSpace?: string | null;
}) {
  const pressStartHref = reserved
    ? registerHref
    : `${registerHref}${registerHref.includes("?") ? "&" : "?"}tag=${encodeURIComponent(handle)}`;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-void px-6 text-center">
      <p className="font-pixel text-[10px] uppercase tracking-widest text-white/40">
        ONE COCREATION NAME NOT FOUND
      </p>
      <p className="font-arcade text-5xl text-ghost glow-ghost">Unclaimed</p>
      <p className="font-pixel text-xs uppercase text-white/80">
        No one holds <span className="text-coin">{handle}{spaceTag}</span>
      </p>
      {reserved ? (
        <p className="max-w-md font-body text-lg text-white/80">
          This name is held back by the house — it can&apos;t be claimed. Another
          name is waiting for you, first-come.
        </p>
      ) : (
        <p className="max-w-md font-body text-lg text-white/80">
          This name isn&apos;t claimed yet — it might be free. Names are first-come:
          claim it and make it yours before someone else does.
        </p>
      )}
      {elsewhereSpace && !reserved && (
        <p className="border-2 border-cyan/60 px-4 py-3 font-pixel text-[10px] uppercase text-cyan">
          This name lives in another space —{" "}
          <Link href={`/u/${handle}@${elsewhereSpace}`} className="underline hover:glow-cyan">
            view {handle}@{elsewhereSpace} </Link>
        </p>
      )}
      <Link href={pressStartHref} className="button pulse-neon"> Claim This Name
      </Link>
      <Link href={registerHref} className="font-pixel text-xs text-cyan hover:glow-cyan">
        Search another name
      </Link>
      <p className="font-pixel text-[10px] uppercase text-white/40">
        Registration is free — on the house
      </p>
      <p className="font-pixel text-xs text-white/40">
        <Link href="/" className="text-cyan hover:glow-cyan">
          Back to One Cocreation
        </Link>
      </p>
    </main>
  );
}
