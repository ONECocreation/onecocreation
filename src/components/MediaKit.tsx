"use client";

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { oneCocreationTheme } from "@/lib/brand-onecocreation";

/**
 * MEDIA / ASSETS — the emojipedia replacement, but ours. Copy a ₿, a sat mark,
 * the BFT markers, the site mark, the wordmark, the palette, and a press
 * blurb — all one click to the clipboard, without leaving home.
 *
 * House laws bound here: honest "copied ✓" states (and an honest "copy failed"
 * when the clipboard is blocked), NO wireframe arrows, motion-safe, mobile
 * first, and GOLD = MONEY ONLY — coin gold rides the ₿ and the sat mark
 * (sats are money); the a₿ / b₿ / ▣ markers are cyan (they're time), and ⚡
 * is neon (the live rail). Nothing decorative wears gold.
 */

/* The press blurbs — warm and true, the spirit of the mission. */
const PRESS_ONELINER =
  "One Cocreation is the way of the heart — sessions, meditations, and a community where heaven and earth meet, with a free, sovereign name@onecocreation tag: your name, your keys, verified on nostr and tied to Bitcoin.";

const PRESS_PARAGRAPH =
  "One Cocreation is where heaven and earth meet — a home for sessions, meditations, and the community room, walked the way of the heart. Claim a free name@onecocreation tag and it's yours forever: a name bound to keys only you hold, verifiable on nostr and anchored to Bitcoin — no rent, no resets, nobody to ask. Everything gets tied to the block.";

/** Copy-to-clipboard button with an honest state machine: idle → copied ✓,
    or → copy failed when the clipboard API is blocked. Reverts after a beat. */
function CopyButton({
  value,
  label = "COPY",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1600);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const tone =
    state === "copied"
      ? "border-neon text-neon"
      : state === "failed"
        ? "border-ghost text-ghost"
        : "border-edge text-white/70 hover:border-cyan hover:text-cyan";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className={`font-pixel text-[10px] uppercase tracking-widest border-2 px-3 py-2 transition-colors motion-reduce:transition-none ${tone} ${className}`}
    >
      {state === "copied" ? "COPIED ✓" : state === "failed" ? "COPY FAILED" : label}
    </button>
  );
}

/**
 * The SATOSHI mark — Candidate A, "THE STRUCK ESS": a lowercase gold s
 * pierced by ₿'s two vertical hash-bars. Composited inline (no font codepoint
 * exists for the satoshi), scales with font-size, wears coin gold because sats
 * ARE money. A PROPOSAL — not yet a settled standard.
 */
function SatMark({ style }: { style?: CSSProperties }) {
  const bar: CSSProperties = { top: "-0.16em", bottom: "-0.16em", width: "0.085em" };
  return (
    <span
      className="relative inline-block font-mono font-bold text-coin"
      style={{ padding: "0 0.07em", ...style }}
      role="img"
      aria-label="satoshi mark (a proposal — the struck ess)"
    >
      <span aria-hidden>s</span>
      <span aria-hidden className="absolute bg-current" style={{ ...bar, left: "0.22em" }} />
      <span aria-hidden className="absolute bg-current" style={{ ...bar, left: "0.40em" }} />
    </span>
  );
}

type Accent = { glyph: string; kicker: string };
const MONEY: Accent = { glyph: "text-coin glow-coin", kicker: "text-coin" };
const TIME: Accent = { glyph: "text-cyan", kicker: "text-cyan" };
const RAIL: Accent = { glyph: "text-neon", kicker: "text-neon" };

/** One copyable glyph: big mark, a one-line "what it is", and a COPY button. */
function GlyphCard({
  glyph,
  kicker,
  badge,
  note,
  copyValue,
  copyLabel,
  accent,
}: {
  glyph: ReactNode;
  kicker: string;
  badge?: string;
  note: string;
  copyValue: string;
  copyLabel: string;
  accent: Accent;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border-2 border-edge bg-panel p-5 text-center">
      <span className="font-pixel text-[9px] uppercase tracking-widest">
        <span className={accent.kicker}>{kicker}</span>
        {badge ? <span className="text-white/40"> · {badge}</span> : null}
      </span>
      <div className={`flex h-20 items-center justify-center font-mono text-6xl leading-none ${accent.glyph}`}>
        {glyph}
      </div>
      <p className="min-h-[3.5em] font-body text-xs leading-snug text-white/60">{note}</p>
      <CopyButton value={copyValue} label={copyLabel} className="w-full" />
    </div>
  );
}

/** A palette swatch that copies its own hex — honest ✓ on the value line. */
function SwatchButton({ name, hex, role }: { name: string; hex: string; role: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = hex.toUpperCase();

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value stays on screen to copy by hand */
    }
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className="group flex flex-col border-2 border-edge bg-panel p-2 text-left transition-colors hover:border-cyan motion-reduce:transition-none"
    >
      <span className="h-14 w-full border border-edge" style={{ backgroundColor: hex }} aria-hidden />
      <span className="mt-2 font-pixel text-[10px] uppercase text-white/80">{name}</span>
      <span className={`font-mono text-[10px] ${copied ? "text-neon" : "text-white/50"}`}>
        {copied ? "COPIED ✓" : value}
      </span>
      <span className="font-body text-[10px] text-white/40">{role}</span>
    </button>
  );
}

const t = oneCocreationTheme.tokens;
const SWATCHES: ReadonlyArray<{ name: string; hex: string; role: string }> = [
  { name: "space", hex: t.space, role: "surface" },
  { name: "cream", hex: t.cream, role: "text" },
  { name: "gold", hex: t.gold, role: "money ONLY" },
  { name: "purple", hex: t.purple, role: "info · verify" },
  { name: "lavender", hex: t.lavender, role: "live / success" },
  { name: "rose", hex: t.rose, role: "danger — gentle" },
  { name: "magenta", hex: t.magenta, role: "flair 💜" },
  { name: "copper", hex: t.copper, role: "warmth" },
];

export default function MediaKit() {
  return (
    <>
      {/* Hero — informational, so no gold (gold is money only) */}
      <header className="mgmt-head">
        <p className="mgmt-eyebrow">Media & assets</p>
        <h1 className="mgmt-title">
          Copy a <span className="text-coin">₿</span> without leaving home
        </h1>
        <p className="mgmt-blurb">
          Bitcoin glyphs, the One Cocreation brand, and a press blurb — each one
          click to your clipboard. No trip to emojipedia required.
        </p>
      </header>

      {/* 1 — BITCOIN GLYPHS */}
      <section className="mt-10 border-t border-dashed border-edge py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-pixel text-sm text-cyan">Bitcoin glyphs</h2>
          <p className="mt-2 font-body text-sm text-white/60">
            Click to copy. <span className="text-coin">Gold is money</span> (the ₿ and the sat
            mark); <span className="text-cyan">cyan is time</span> (the date markers);{" "}
            <span className="text-neon">neon is the rail</span>.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <GlyphCard
              glyph="₿"
              kicker="MONEY"
              note="Bitcoin sign — Unicode U+20BF. The whole coin; 1 ₿ = 100,000,000 sats."
              copyValue="₿"
              copyLabel="COPY ₿"
              accent={MONEY}
            />
            <GlyphCard
              glyph={<SatMark />}
              kicker="MONEY"
              badge="PROPOSAL"
              note="Satoshi — the cent of bitcoin, 100,000,000 to the ₿. No Unicode exists; paste the word."
              copyValue="sats"
              copyLabel={'COPY "SATS"'}
              accent={MONEY}
            />
            <GlyphCard
              glyph="a₿"
              kicker="TIME"
              note="After-bitcoin date marker — rides after a BFT date: 0018.04.15 a₿."
              copyValue="a₿"
              copyLabel="COPY a₿"
              accent={TIME}
            />
            <GlyphCard
              glyph="b₿"
              kicker="TIME"
              note="Before-bitcoin marker — pre-genesis dates wear it the same way, after the date."
              copyValue="b₿"
              copyLabel="COPY b₿"
              accent={TIME}
            />
            <GlyphCard
              glyph="▣"
              kicker="TIME"
              note="Block marker — prefixes a height when the block itself matters: ▣ 957,661."
              copyValue="▣"
              copyLabel="COPY ▣"
              accent={TIME}
            />
            <GlyphCard
              glyph="⚡"
              kicker="RAIL"
              note="Lightning — the rail sats ride: instant, tiny, off-chain settlement."
              copyValue="⚡"
              copyLabel="COPY ⚡"
              accent={RAIL}
            />
          </div>

          <p className="mt-6 border-2 border-edge bg-panel p-4 font-body text-xs leading-relaxed text-white/50">
            <span className="font-pixel text-[10px] uppercase tracking-widest text-white/60">
              On the sat mark ·{" "}
            </span>
            The struck ess (<SatMark style={{ fontSize: "1.1em" }} />) is the lead among
            four satoshi-mark candidates — a lowercase gold s wearing ₿&apos;s two hash-bars.
            It&apos;s <span className="text-white/70">a proposal, not yet a settled
            standard</span>, so the honest copyable value is the text fallback{" "}
            <span className="font-mono text-coin">sats</span> — the word wallets already print.
          </p>
        </div>
      </section>

      {/* 2 — BRAND ASSETS */}
      <section className="border-t border-dashed border-edge py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-pixel text-sm text-cyan">Brand assets</h2>
          <p className="mt-2 font-body text-sm text-white/60">
            The mark, the wordmark, and the celestial palette.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* The mark */}
            <div className="border-2 border-edge bg-panel p-6">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/onecocreation-coin-gold.svg"
                  alt="One Cocreation mark — the gold coin holding a star"
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0"
                />
                <div>
                  <p className="font-pixel text-xs text-white">The mark</p>
                  <p className="mt-1 font-body text-xs leading-snug text-white/60">
                    The gold coin holding a star — where heaven and earth meet.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href="/brand/onecocreation-coin-gold.svg"
                  download="onecocreation-coin-gold.svg"
                  className="border-2 border-edge px-3 py-2 font-pixel text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:border-cyan hover:text-cyan motion-reduce:transition-none"
                >
                  DOWNLOAD SVG
                </a>
                <a
                  href="/brand/onecocreation-mark-gold.svg"
                  download="onecocreation-mark-gold.svg"
                  className="border-2 border-edge px-3 py-2 font-pixel text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:border-cyan hover:text-cyan motion-reduce:transition-none"
                >
                  DOWNLOAD FULL LOCKUP
                </a>
              </div>
            </div>

            {/* The wordmark */}
            <div className="flex flex-col justify-between border-2 border-edge bg-panel p-6">
              <div>
                <p className="font-pixel text-[9px] tracking-widest text-white/40">
                  The wordmark
                </p>
                <p className="mt-3 font-arcade text-3xl text-white sm:text-4xl">One Cocreation</p>
              </div>
              <div className="mt-5">
                <CopyButton value="One Cocreation" label="COPY WORDMARK" />
              </div>
            </div>
          </div>

          {/* The palette */}
          <p className="mt-8 font-pixel text-[10px] tracking-widest text-white/50">
            The palette — click a swatch to copy its hex
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SWATCHES.map((s) => (
              <SwatchButton key={s.name} name={s.name} hex={s.hex} role={s.role} />
            ))}
          </div>

          <p className="mt-6 border-2 border-edge bg-panel p-4 font-body text-xs leading-relaxed text-white/50">
            <span className="font-pixel text-[10px] uppercase tracking-widest text-white/60">
              Usage ·{" "}
            </span>
            <span className="text-coin">Gold is money, and only money.</span> The brand runs
            on the night sky — keep the mark on dark, at its natural aspect, never squeezed.
          </p>
        </div>
      </section>

      {/* 3 — FOR PRESS */}
      <section className="border-t border-dashed border-edge py-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-pixel text-sm text-cyan">For press</h2>
          <p className="mt-2 font-body text-sm text-white/60">
            Writing about us? Copy and paste — it&apos;s warm and it&apos;s true.
          </p>

          <div className="mt-8 space-y-6">
            <div className="border-2 border-edge bg-panel p-6">
              <p className="font-pixel text-[9px] tracking-widest text-white/40">
                One-liner
              </p>
              <blockquote className="mt-3 font-body text-base leading-relaxed text-white/80">
                {PRESS_ONELINER}
              </blockquote>
              <div className="mt-5">
                <CopyButton value={PRESS_ONELINER} label="COPY ONE-LINER" />
              </div>
            </div>

            <div className="border-2 border-edge bg-panel p-6">
              <p className="font-pixel text-[9px] tracking-widest text-white/40">
                Short paragraph
              </p>
              <blockquote className="mt-3 font-body text-base leading-relaxed text-white/80">
                {PRESS_PARAGRAPH}
              </blockquote>
              <div className="mt-5">
                <CopyButton value={PRESS_PARAGRAPH} label="COPY PARAGRAPH" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
