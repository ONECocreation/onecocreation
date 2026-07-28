import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/onecocreation-badge.png" alt="" width={38} height={38} />
          <b style={{ fontFamily: "var(--serif)", color: "var(--gold-2)", letterSpacing: ".12em" }}>ONE Cocreation</b>
        </div>
        <nav className="fnav">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/packages">Memberships</Link>
          <Link href="/jewelry">Adornments</Link>
          <Link href="/services">Sessions</Link>
          <Link href="/classes">Community</Link>
          <Link href="/support">⚡ Support</Link>
        </nav>
        <p className="legal">Copyright © 2026 One Cocreation · Terms &amp; Conditions · Privacy Policy</p>
        <p className="rebuild">
          Built on the Pac&apos;s Arcade brand kit — a free, bitcoin-native home migrated off ShinePages. Bitcoin
          surfaces are non-custodial to One Cocreation&apos;s own node. Phased build; see README for what is live vs
          stub.
        </p>
      </div>
    </footer>
  );
}
