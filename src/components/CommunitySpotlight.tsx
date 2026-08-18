import Link from "next/link";
import { cartridge } from "@/brand/cartridge";

/**
 * THE COMMUNITY SPOTLIGHT (Admiral's word, 0018.05.15): before the rooms
 * open, say WHO holds them — Love is a healer, and this is what she does:
 * the silent haircuts, the retreats, the 11:11 lives. Under it, the Voices
 * of the Field — her real YouTube comments — drift by on a slow ticker
 * (pause on hover, still and wrapped for reduced-motion). Each voice is a
 * door to the video it was left under.
 */
export default function CommunitySpotlight() {
  const doors = [
    { icon: "✂️", title: "Silent Haircuts", sub: "ConsciousCuts & Waxing — soul work in sacred silence, where the mobile studio travels.", href: "/services", cta: "the way of the heart" },
    { icon: "🏜️", title: "Retreats", sub: "Days together at a place — held, fed, and walked in the field.", href: "/retreats", cta: "see what's forming" },
    { icon: "📺", title: "11:11 Live with Love", sub: "Mon · Wed · Fri @ ~11:11 (MST/PST) — or there abouts ;)", href: "https://www.youtube.com/@Onecocreation", cta: "@Onecocreation", external: true },
  ];
  return (
    <div style={{ margin: "0 0 34px" }}>
      <p className="reveal" style={{ color: "var(--ink-body)", fontSize: ".95rem", maxWidth: 640, margin: "0 0 18px" }}>
        This community gathers around a healer. Love holds the field in more ways than the
        rooms below — find her where she works:
      </p>
      <div style={{ display: "grid", gap: 14,
        gridTemplateColumns: "repeat(auto-fit, minmax(min(230px, 100%), 1fr))" }}>
        {doors.map((d, i) => {
          const body = (
            <div className="body center">
              <div style={{ fontSize: "1.6rem" }}>{d.icon}</div>
              <h3 style={{ fontWeight: 400, fontSize: "1.05rem", margin: "6px 0 2px" }}>{d.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>{d.sub}</p>
              <span className="push" style={{ paddingTop: 10, fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "var(--gold-deep)" }}>{d.cta}</span>
            </div>
          );
          const style = { textDecoration: "none", transitionDelay: `${i * 0.1}s` } as const;
          return d.external ? (
            <a key={d.title} className="card reveal" href={d.href} target="_blank" rel="noreferrer" style={style}>{body}</a>
          ) : (
            <Link key={d.title} className="card reveal" href={d.href} style={style}>{body}</Link>
          );
        })}
      </div>

      {/* ── voices of the field ── */}
      <div className="reveal" style={{ marginTop: 26 }}>
        <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase",
          color: "var(--muted)", margin: "0 0 10px" }}>
          Voices of the Field — from the channel 💬
        </p>
        <div className="voice-ticker" aria-label="What the community says on YouTube">
          <div className="voice-track">
            {[0, 1].map((pass) =>
              cartridge.voices.map((v, i) => (
                <a key={`${pass}-${i}`} className="voice-chip" href={v.href} target="_blank" rel="noreferrer"
                  aria-hidden={pass === 1} title={`${v.who} on YouTube`}>
                  <span className="voice-quote">&ldquo;{v.quote}&rdquo;</span>
                  <span className="voice-who">— {v.name} · YouTube</span>
                </a>
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
