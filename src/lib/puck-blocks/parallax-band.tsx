import type { ReactElement } from "react";
import ParallaxImg from "./ParallaxImg";
import "./parallax.css";

/**
 * ParallaxBand (STUDIO P2, ALT-2A ruled): the original platform's signature
 * moving-ground band, as a LOCAL block — the vendored @pacsarcade/puck-config
 * stays untouched, so this is a faithful Band-equivalent (same grounds, same
 * hold-the-night trick, same .wrap content slot) plus the opt-in parallax
 * layer (ParallaxImg does the measured IO + rAF dance).
 *
 * Root-only by construction, mirroring the package's NO_FULL_WIDTH intent:
 * this block's own slot disallows Band/Hero/ParallaxBand, and the shim
 * (puck-config.tsx) extends every package slot that bans full-width blocks
 * to ban ParallaxBand too.
 *
 * KNOWN LIMITATION (same as Band's 0.13.0 custom grounds): plugin-rails
 * ground-tracking doesn't know the parallax ground — a parallax band keeps
 * being lint-tracked as its `hold` ground. Documented, accepted.
 */

type BandGround = "sky-veil" | "sky-glass" | "sky-warm" | "nebula" | "meteors" | "plain";

interface ParallaxBandProps {
  background: BandGround;
  hold: "night" | "theme";
  bgSrc?: string;
  bgColor?: string;
  parallax: "yes" | "no";
  speed: "slow" | "medium" | "fast";
  /* the field STORES a slot data array; Puck hands render a ready component */
  content: React.ComponentType;
}

export function createParallaxBand(opts: {
  assets: { nebula: string; meteors: string };
  mediaField?: (props: { value: string; onChange: (v: string) => void }) => ReactElement;
}) {
  return {
    label: "Parallax band (moving ground)",
    fields: {
      background: {
        type: "select" as const,
        options: [
          { label: "Night veil", value: "sky-veil" },
          { label: "Night glass", value: "sky-glass" },
          { label: "Warm night", value: "sky-warm" },
          { label: "Nebula photo", value: "nebula" },
          { label: "Meteors photo", value: "meteors" },
          { label: "Plain", value: "plain" },
        ],
      },
      hold: {
        type: "select" as const,
        options: [
          { label: "Hold the night", value: "night" },
          { label: "Follow theme", value: "theme" },
        ],
      },
      /* the parallax ground rides the same media DI as Band.bgSrc so the
         library picker works here too (adapted for the optional prop) */
      bgSrc: opts.mediaField
        ? {
            type: "custom" as const,
            label: "Background image (custom URL)",
            render: (p: { value: string | undefined; onChange: (v: string | undefined) => void }) =>
              opts.mediaField!({ value: p.value ?? "", onChange: p.onChange }),
          }
        : { type: "text" as const, label: "Background image (custom URL)" },
      bgColor: { type: "text" as const, label: "Background color (hex/css)" },
      /* the artist's opt-in (off by default) + the speed slider as a select
         — Puck has no slider field; slow/medium/fast are the ruled values */
      parallax: {
        type: "radio" as const,
        label: "Parallax (needs a background image)",
        options: [
          { label: "Off", value: "no" },
          { label: "On", value: "yes" },
        ],
      },
      speed: {
        type: "select" as const,
        label: "Parallax speed",
        options: [
          { label: "Slow — a subtle drift", value: "slow" },
          { label: "Medium", value: "medium" },
          { label: "Fast — a full sweep", value: "fast" },
        ],
      },
      content: { type: "slot" as const, disallow: ["Band", "Hero", "ParallaxBand"] },
    },
    defaultProps: {
      /* opt-in law: parallax is OFF by default — the artist turns it on */
      background: "sky-glass", hold: "theme", parallax: "no", speed: "slow", content: [],
    },
    render: ({ background, hold, bgSrc, bgColor, parallax, speed, content: Content }: ParallaxBandProps) => {
      const photo =
        background === "nebula" ? opts.assets.nebula
        : background === "meteors" ? opts.assets.meteors
        : null;
      const veil = "linear-gradient(180deg, rgba(14,10,28,.68), rgba(14,10,28,.78))";
      const ground = bgSrc || photo;
      /* parallax only when the artist opted in AND there's an image to move */
      const on = parallax === "yes" && Boolean(ground);
      const style: React.CSSProperties = { padding: "60px 0", position: "relative" };
      if (on) {
        style.overflow = "hidden"; /* the clip — the img lives inside it */
        if (bgColor) style.backgroundColor = bgColor;
      } else if (ground) {
        /* Band's own path, verbatim: veil overlay + cover/center */
        style.backgroundImage = `${veil}, url(${ground})`;
        style.backgroundSize = "cover";
        style.backgroundPosition = "center";
      } else if (bgColor) {
        style.backgroundColor = bgColor;
      }
      const cls = [
        ground || bgColor ? "" : background === "plain" ? "" : background,
        hold === "night" ? "keep-dark" : "",
      ].filter(Boolean).join(" ");
      return (
        <section className={cls} style={style}>
          {on && ground ? <ParallaxImg src={ground} speed={speed} /> : null}
          {on && <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, background: veil }} />}
          <div className="wrap" style={{ maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 2 }}>
            <Content />
          </div>
        </section>
      );
    },
  };
}
