import Link from "next/link";
import { cartridge } from "@/brand/cartridge";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cartridge.logo.mark} alt="" width={38} height={38} />
          <b style={{ fontFamily: "var(--serif)", color: "var(--gold-2)", letterSpacing: ".12em" }}>ONE Cocreation</b>
        </div>
        <nav className="fnav">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/memberships">Memberships</Link>
          <Link href="/book">Sessions</Link>
          <Link href="/classes">Community</Link>
          <Link href="/support">⚡ Support</Link>
        </nav>
        <p className="legal">Copyright © 2026 One Cocreation · <Link href="/terms" style={{ color: "inherit" }}>Terms &amp; Conditions</Link> · <Link href="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link></p>
        {/* TASK-119 (0018.06.16 a₿): Store link removed; the "migrated off
            ShinePages" rebuild line deleted (Love's Sept 1 list). */}
      </div>
    </footer>
  );
}
