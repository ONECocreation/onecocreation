"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartridge } from "@/brand/cartridge";
import type { SiteConfig } from "@/lib/site-config";

/**
 * TASK-129 (0018.06.16 a₿): the footer doors read THE SWITCHES like the nav
 * — Sessions only when `sessions`, Community only when `community`; Home ·
 * About · Memberships · Support stand in every config. Same public-switches
 * fetch as NavMenu (the footer is client-reachable via FrenProfile/
 * OperatorGate, so the doc can't be passed down from a server parent); until
 * the answer lands only the always-on doors render.
 */
export default function SiteFooter() {
  const [switches, setSwitches] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetch("/api/admin/site", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.ok && d.config && setSwitches(d.config))
      .catch(() => {});
  }, []);

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
          {switches?.features.sessions && <Link href="/book">Sessions</Link>}
          <Link href="/classes">Community</Link>{/* T-137 seam: the header always shows Community now; the footer follows */}
          <Link href="/support">⚡ Support</Link>
        </nav>
        <p className="legal">Copyright © 2026 One Cocreation · <Link href="/terms" style={{ color: "inherit" }}>Terms &amp; Conditions</Link> · <Link href="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link></p>
        {/* TASK-119 (0018.06.16 a₿): Store link removed; the "migrated off
            ShinePages" rebuild line deleted (Love's Sept 1 list). */}
      </div>
    </footer>
  );
}
