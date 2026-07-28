import Link from "next/link";

/** Dark celestial header, true to One Cocreation's brand mark. */
export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="bar">
        <Link href="/" className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brandmark" src="/brand/onecocreation-badge.png" alt="One Cocreation" width={44} height={44} />
          <span className="wm">
            <b>ONE</b>
            <span>Cocreation</span>
          </span>
        </Link>
        <nav className="site-nav">
          <Link href="/about">About</Link>
          <Link href="/packages">Memberships</Link>
          <Link href="/jewelry">Adornments</Link>
          <Link href="/services">Sessions</Link>
          <Link href="/classes">Community</Link>
          <Link href="/#free">Free Meditation</Link>
          <Link href="/support" className="sats-pill">⚡ Support</Link>
        </nav>
      </div>
    </header>
  );
}
