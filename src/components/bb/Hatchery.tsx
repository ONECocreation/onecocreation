"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredBuddy, Npub } from "@/lib/bb/types";
import { defaultCritter, pixelizeImage, loadImageFile } from "@/lib/bb/sprite";
import BftDate from "@/components/bb/BftDate";
import { newBuddyId } from "@/lib/bb/store";

/**
 * The hatchery: name a buddy and (optionally) bring it to life from a photo of
 * something you own — pixelized with the background dropped out so it's a real
 * pet, not a photo box (design notes Part 5). Hatches at the current block —
 * and ONLY a live one: the chain must witness a birth (fleet ruling
 * 0018.05.26 a₿), so a dark node keeps the hatch shut and no bornBlock is
 * ever etched from a guess.
 */
export default function Hatchery({
  npub, currentBlock, onHatched,
}: {
  npub: Npub;
  /* live tip or null (node dark — no reading, no birth) */
  currentBlock: number | null;
  onHatched: (b: StoredBuddy) => void;
}) {
  const [name, setName] = useState("");
  const [removeBg, setRemoveBg] = useState(true);
  const [tol, setTol] = useState(60);
  const [size, setSize] = useState(44);
  const [preview, setPreview] = useState<string>("");
  const imgRef = useRef<HTMLImageElement | null>(null);

  const clean = (name.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "buddy");

  const recompute = useCallback(() => {
    setPreview(imgRef.current ? pixelizeImage(imgRef.current, { size, removeBg, tol }) : defaultCritter(npub + clean));
  }, [size, removeBg, tol, npub, clean]);

  useEffect(() => { recompute(); }, [recompute]);

  const onFile = useCallback(async (file?: File) => {
    if (!file) return;
    try {
      imgRef.current = await loadImageFile(file);
      recompute();
    } catch { /* not an image */ }
  }, [recompute]);

  const hatch = () => {
    if (currentBlock == null) return; // the chain must witness a birth — no live tip, no bornBlock
    const sprite = preview || defaultCritter(npub + clean);
    onHatched({
      id: newBuddyId(),
      name: clean,
      owners: [npub],
      bornBlock: currentBlock,
      vitals: { hunger: 100, happiness: 100, energy: 100 },
      lastTick: Date.now(),
      sprite,
      alive: true,
      stage: "baby",
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border-2 border-edge bg-panel p-6">
      <div>
        <h3 className="font-arcade text-xl text-neon glow-neon">The Hatchery</h3>
        <p className="mt-1 font-body text-sm text-white/70">
          Bring something you own to life. Drop a photo — a mug, a pet, a sticker — and we&apos;ll
          pixel-hatch it into a Buddy born at the block. Or just name one and hatch the house critter.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">Pixel Buddy</p>
          <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-edge bg-[#0a0f0c]">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="your buddy" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-edge px-3 py-4 text-center font-mono text-[11px] text-white/50 transition hover:border-neon hover:text-neon">
            📷 Use a photo
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <label className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/50">
            Remove background
            <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="accent-[color:var(--color-neon)]" />
          </label>
          {removeBg && (
            <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-wider text-white/50">
              Cutout strength · {tol}
              <input type="range" min={16} max={150} step={2} value={tol} onChange={(e) => setTol(+e.target.value)} className="accent-[color:var(--color-neon)]" />
            </label>
          )}
          <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-wider text-white/50">
            Pixel size · {size}
            <input type="range" min={16} max={80} step={4} value={size} onChange={(e) => setSize(+e.target.value)} className="accent-[color:var(--color-neon)]" />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[10px] uppercase tracking-widest text-white/40">Name your Buddy</label>
        <input type="text" maxLength={14} placeholder="e.g. Nubbins" value={name} onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-edge bg-[#0b120e] px-3 py-2.5 font-mono text-sm tracking-wide text-white outline-none focus:border-pink" />
        <span className="font-mono text-[11px] text-pink">
          {clean}@onecocreation · born{" "}
          {currentBlock != null ? <BftDate height={currentBlock} /> : "—"}
        </span>
      </div>

      <button onClick={hatch} disabled={currentBlock == null} className="button w-full text-center disabled:cursor-not-allowed disabled:opacity-50">
        Hatch your Buddy 💜
      </button>
      {currentBlock == null && (
        <p className="-mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-white/40">
          The chain must witness a birth — node dark, try again when the tip reads
        </p>
      )}
    </div>
  );
}
