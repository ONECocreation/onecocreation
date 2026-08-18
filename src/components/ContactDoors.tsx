import Link from "next/link";

/**
 * THE THREE DOORS (Admiral's word, 0018.05.15): the discovery call, the
 * 11:11 lives, and ConsciousCuts — ONE component for the homepage and
 * /contact both. The pages drifted apart once; they don't get to again.
 */
export default function ContactDoors() {
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900, margin: "0 auto",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))" }}>
      <Link className="card reveal" href="/book/discovery-call" style={{ textDecoration: "none" }}>
        <div className="body center">
          <div style={{ fontSize: "1.7rem" }}>🕊️</div>
          <h3 style={{ fontWeight: 400, fontSize: "1.1rem", margin: "6px 0 2px" }}>Book a Discovery Call</h3>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: 0 }}>
            30 minutes to feel into what&apos;s next — credited toward your first service.
          </p>
          <span className="push" style={{ paddingTop: 12, fontSize: ".74rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".06em", color: "var(--gold-deep)" }}>book now ⚡</span>
        </div>
      </Link>
      <a className="card reveal" href="https://www.youtube.com/@Onecocreation" target="_blank" rel="noreferrer"
        style={{ textDecoration: "none", transitionDelay: ".1s" }}>
        <div className="body center">
          <div style={{ fontSize: "1.7rem" }}>📺</div>
          <h3 style={{ fontWeight: 400, fontSize: "1.1rem", margin: "6px 0 2px" }}>11:11 Live with Love</h3>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: 0 }}>
            Mon · Wed · Fri @ ~11:11 (MST/PST) — or there abouts ;)
          </p>
          <span className="push" style={{ paddingTop: 12, fontSize: ".74rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".06em", color: "var(--gold-deep)" }}>@Onecocreation</span>
        </div>
      </a>
      <Link className="card reveal" href="/services" style={{ textDecoration: "none", transitionDelay: ".2s" }}>
        <div className="body center">
          <div style={{ fontSize: "1.7rem" }}>✂️</div>
          <h3 style={{ fontWeight: 400, fontSize: "1.1rem", margin: "6px 0 2px" }}>ConsciousCuts &amp; Waxing</h3>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: 0 }}>
            The silent sessions — where the mobile studio travels.
          </p>
          <span className="push" style={{ paddingTop: 12, fontSize: ".74rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: ".06em", color: "var(--gold-deep)" }}>the way of the heart</span>
        </div>
      </Link>
    </div>
  );
}
