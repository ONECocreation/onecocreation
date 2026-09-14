/**
 * THE FULL-FRAME SCENES (TASK-244) — three OPAQUE 1920×1080 renders beside
 * T-191's transparent OverlayStage: starting soon (with an optional
 * countdown), be right back, and thank you. Unlike the overlay scenes
 * (laid over VDO's own camera picture), these ARE the whole picture —
 * OBS or VDO.Ninja's own "show in the studio" website source shows one of
 * these full-screen with no camera behind it at all.
 *
 * Same law as OverlayStage: every word is derived (the roster doc, the
 * cartridge), nothing hand-typed; the shared night ground is the
 * cartridge's own hero nebula, dimmed, under the cartridge mark; Barlow
 * everywhere (no serif anywhere, ever). A server component — no hydration
 * except the one tiny Countdown island the "starting" scene may mount.
 */

import type { StudioSceneId } from "@/lib/studio/scenes";
import type { OverlayTokens } from "./OverlayStage";
import Countdown from "./Countdown";

export interface FullSceneProps {
  /** one of the three full-frame ids — a non-full id never reaches here */
  scene: Extract<StudioSceneId, "starting" | "brb" | "ending">;
  /** derive-or-dash already applied upstream (doc.showTitle || the cartridge's product name) */
  showTitle: string;
  /** the cartridge's mark — the logo bug, centred here (no LIVE pill: nothing is live on this frame) */
  mark: string;
  /** the cartridge's hero nebula — the night ground every full scene shares, dimmed */
  nebula: string;
  /** the book picture (public/images/reading-book.webp), intrinsic 1400×1017 */
  book: string;
  /** the "starting soon" scene's countdown target, ISO — "" = no clock, never 00:00 */
  startsAt: string;
  /** the "thank you" scene's after-hours line — "" = omitted (derive-or-dash) */
  afterHoursLine: string;
  /** the site's door, as words — never a button (it's a picture on a stream) */
  membershipsWords: string;
  tokens: OverlayTokens;
}

const STAGE: React.CSSProperties = { position: "fixed", inset: 0, width: 1920, height: 1080, overflow: "hidden" };

function NightGround({ nebula, tokens, children }: { nebula: string; tokens: OverlayTokens; children: React.ReactNode }) {
  return (
    <div style={{ ...STAGE, background: tokens.space }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a broadcast ground, not content: no optimizer on the OBS surface */}
      <img
        src={nebula}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.34 }}
      />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${tokens.space}cc, ${tokens.space}f5)` }} />
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}

function Mark({ mark }: { mark: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a broadcast bug, not content
    <img
      src={mark}
      alt=""
      style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", height: 84, opacity: 0.92 }}
    />
  );
}

function Book({ src, width }: { src: string; width: number }) {
  const height = Math.round(width * (1017 / 1400));
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a broadcast picture, not content
    <img
      src={src}
      alt=""
      width={1400}
      height={1017}
      style={{ width, height, borderRadius: 18, boxShadow: "0 30px 90px rgba(0,0,0,.55)", display: "block" }}
    />
  );
}

export default function FullScene({
  scene, showTitle, mark, nebula, book, startsAt, afterHoursLine, membershipsWords, tokens,
}: FullSceneProps) {
  const title: React.CSSProperties = { fontFamily: tokens.displayFont, fontWeight: 700, color: tokens.cream, letterSpacing: ".02em" };
  const soft: React.CSSProperties = { fontFamily: tokens.displayFont, fontWeight: 500, color: tokens.teal, letterSpacing: ".04em" };

  if (scene === "starting") {
    return (
      <div style={STAGE} data-scene={scene}>
        <NightGround nebula={nebula} tokens={tokens}>
          <Mark mark={mark} />
          <div style={{ position: "absolute", left: 190, top: 250 }}>
            <Book src={book} width={480} />
          </div>
          <div style={{ position: "absolute", left: 760, top: 300, width: 980, display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ ...title, fontSize: 30, color: tokens.rose, letterSpacing: ".28em", textTransform: "uppercase" }}>
              starting soon
            </span>
            <span style={{ ...title, fontSize: 64, lineHeight: 1.1 }}>{showTitle}</span>
            {startsAt ? (
              <Countdown
                target={startsAt}
                style={{ ...title, fontSize: 96, color: tokens.rose, fontVariantNumeric: "tabular-nums" }}
              />
            ) : (
              <span style={{ ...title, fontSize: 40, color: tokens.rose }}>starting soon</span>
            )}
            <span style={{ ...soft, fontSize: 26 }}>breathe with us — the room opens when Love is live</span>
          </div>
        </NightGround>
      </div>
    );
  }

  if (scene === "brb") {
    return (
      <div style={STAGE} data-scene={scene}>
        <NightGround nebula={nebula} tokens={tokens}>
          <Mark mark={mark} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
            <span style={{ ...title, fontSize: 72 }}>be right back</span>
            <span style={{ ...soft, fontSize: 28 }}>breathe with us — we&apos;re back in a moment</span>
            <Book src={book} width={220} />
          </div>
        </NightGround>
      </div>
    );
  }

  /* ending */
  return (
    <div style={STAGE} data-scene={scene}>
      <NightGround nebula={nebula} tokens={tokens}>
        <Mark mark={mark} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 22, padding: "0 220px", textAlign: "center",
        }}>
          <span style={{ ...title, fontSize: 66 }}>thank you for being here</span>
          <span style={{ ...soft, fontSize: 30, color: tokens.cream }}>{showTitle}</span>
          {afterHoursLine && <span style={{ ...title, fontSize: 26, color: tokens.rose }}>{afterHoursLine}</span>}
          <span style={{ ...soft, fontSize: 22, marginTop: 10 }}>{membershipsWords}</span>
        </div>
      </NightGround>
    </div>
  );
}
