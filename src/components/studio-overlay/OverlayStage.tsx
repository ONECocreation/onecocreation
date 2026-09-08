/**
 * THE OVERLAY STAGE (TASK-191, 0018.06.18 a₿ · block 966119) — the
 * transparent 1920×1080 page OBS captures as a browser source. Three
 * scenes (the Admiral's ruling: solo + runner, side by side, phone
 * go-live), all dressed from the cartridge tokens the page hands down:
 * Barlow for names/titles, the rose door colour on the lower-third bar,
 * teal for the specialty, gold for the runner's items.
 *
 * Every word is derived — the roster doc (names, specialties, show
 * title), the catalogue + calendar (the runner). A name never typed is a
 * third never drawn; an empty shelf is no runner, not invented words
 * (derive-or-dash). A server component: no hydration, no client JS on the
 * broadcast surface.
 */

import type { StudioSceneId } from "@/lib/studio/scenes";
import type { StudioPerson } from "@/lib/studio/roster";
import type { RunnerItem } from "@/lib/studio/runner";

export interface OverlayTokens {
  /** the rose door colour — the lower-third bar */
  rose: string;
  /** MONEY-family gold — the runner's items are the live shelf, commerce's own voice */
  gold: string;
  cream: string;
  /** the cartridge's night — the translucent panel ground */
  space: string;
  /** teal for the specialty line — cartridge.css's token, poured as a var() */
  teal: string;
  /** Barlow — the cartridge's display face */
  displayFont: string;
}

export interface OverlayStageProps {
  scene: StudioSceneId;
  showTitle: string;
  /** the cartridge's mark — the logo bug */
  mark: string;
  host: StudioPerson;
  /** the roster's FIRST guest, or null when the roster is empty */
  guest: StudioPerson | null;
  items: RunnerItem[];
  tokens: OverlayTokens;
}

const STAGE: React.CSSProperties = {
  position: "fixed", inset: 0, width: 1920, height: 1080, overflow: "hidden",
  background: "transparent", pointerEvents: "none",
};

function LivePill({ tokens, title }: { tokens: OverlayTokens; title: string }) {
  return (
    <div style={{ position: "absolute", top: 36, left: 42, display: "flex", alignItems: "center", gap: 18 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        background: tokens.rose, color: tokens.space, borderRadius: 999,
        padding: "8px 22px", fontFamily: tokens.displayFont, fontWeight: 800,
        fontSize: 24, letterSpacing: ".22em",
      }}>
        <span style={{ width: 12, height: 12, borderRadius: 999, background: tokens.space }} />
        LIVE
      </span>
      {title && (
        <span style={{
          fontFamily: tokens.displayFont, fontWeight: 700, fontSize: 30,
          color: tokens.cream, letterSpacing: ".04em", textShadow: `0 2px 18px ${tokens.space}`,
        }}>
          {title}
        </span>
      )}
    </div>
  );
}

function LogoBug({ mark }: { mark: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a broadcast bug, not a content image: no optimizer on the OBS surface
    <img src={mark} alt="" style={{ position: "absolute", top: 36, right: 42, height: 72, opacity: 0.92 }} />
  );
}

function LowerThird({ person, tokens, lead }: { person: StudioPerson; tokens: OverlayTokens; lead?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "stretch", borderRadius: 14, overflow: "hidden",
      background: `color-mix(in srgb, ${tokens.space} 78%, transparent)`,
      boxShadow: "0 18px 50px rgba(0,0,0,.45)", minWidth: lead ? 460 : 380, maxWidth: 560,
    }}>
      {/* the rose door colour — the bar every third wears on its leading edge */}
      <span style={{ width: 10, background: tokens.rose, flex: "0 0 auto" }} />
      <span style={{ padding: "18px 28px 20px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <b style={{
          fontFamily: tokens.displayFont, fontWeight: 700, fontSize: lead ? 40 : 34,
          color: tokens.cream, letterSpacing: ".02em", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {person.name}
        </b>
        {person.specialty && (
          <span style={{
            fontFamily: tokens.displayFont, fontWeight: 600, fontSize: 20,
            color: tokens.teal, textTransform: "uppercase", letterSpacing: ".18em", whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {person.specialty}
          </span>
        )}
      </span>
    </div>
  );
}

function Runner({ items, tokens }: { items: RunnerItem[]; tokens: OverlayTokens }) {
  if (items.length === 0) return null;
  const line = items.map((i) => i.text).join("   ✦   ");
  const strip = (ariaHidden: boolean) => (
    <span aria-hidden={ariaHidden || undefined} style={{
      display: "inline-block", whiteSpace: "nowrap", paddingRight: 120,
      fontFamily: tokens.displayFont, fontWeight: 600, fontSize: 26,
      letterSpacing: ".06em", color: tokens.gold,
    }}>
      {line}
    </span>
  );
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: 64,
      display: "flex", alignItems: "center", overflow: "hidden",
      background: `color-mix(in srgb, ${tokens.space} 82%, transparent)`,
      borderTop: `3px solid ${tokens.rose}`,
    }}>
      <div className="studio-runner-track" style={{ display: "inline-flex", whiteSpace: "nowrap", willChange: "transform" }}>
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  );
}

export default function OverlayStage({ scene, showTitle, mark, host, guest, items, tokens }: OverlayStageProps) {
  const hostNamed = host.name.trim().length > 0;
  return (
    <div style={STAGE} data-scene={scene}>
      {/* transparency is the whole point — kill any themed ground the
          root document may paint behind the stage */}
      <style>{`html,body{background:transparent!important;margin:0}
@keyframes studio-runner{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.studio-runner-track{animation:studio-runner 36s linear infinite}`}</style>
      <LivePill tokens={tokens} title={showTitle} />
      <LogoBug mark={mark} />
      <div style={{ position: "absolute", left: 42, bottom: 96, display: "flex", alignItems: "flex-end", gap: 28 }}>
        {scene === "solo" && hostNamed && <LowerThird person={host} tokens={tokens} lead />}
        {scene === "duo" && (
          <>
            {hostNamed && <LowerThird person={host} tokens={tokens} />}
            {guest && <LowerThird person={guest} tokens={tokens} />}
          </>
        )}
        {scene === "phone" && (
          <>
            {guest && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{
                  alignSelf: "flex-start", borderRadius: 999, padding: "4px 16px",
                  border: `2px solid ${tokens.teal}`, color: tokens.teal,
                  fontFamily: tokens.displayFont, fontWeight: 700, fontSize: 18, letterSpacing: ".2em",
                  background: `color-mix(in srgb, ${tokens.space} 78%, transparent)`,
                }}>
                  BY PHONE
                </span>
                <LowerThird person={guest} tokens={tokens} lead />
              </div>
            )}
            {hostNamed && <LowerThird person={host} tokens={tokens} />}
          </>
        )}
      </div>
      <Runner items={items} tokens={tokens} />
    </div>
  );
}
