"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DoorButton from "./door/DoorButton";
import ThemeLantern from "./ThemeLantern";
import NavMenu from "./NavMenu";
import BasketChip from "./BasketChip";
import { cartridge } from "@/brand/cartridge";

/** Dark celestial header, true to One Cocreation's brand mark.
 *
 * TASK-135 basket gating: this same header IS the site chrome's console
 * header (site-chrome.tsx re-exports it as SiteChromeHeader), so it renders
 * on every /a page too. An operator working the desk has no basket — the
 * chip is hidden under /a entirely rather than showing an empty/irrelevant
 * cart icon on the bridge. "use client" only to read the path; nothing
 * else here needed it. */
export default function SiteHeader() {
  const pathname = usePathname() ?? "";
  const underConsole = pathname === "/a" || pathname.startsWith("/a/");
  return (
    <header className="site-header">
      <div className="bar">
        <Link href="/" className="logo">
          {/* The full lockup Love uses on her live site — rendered at its own
              aspect (1235×533), never squeezed into a square. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brandmark-lockup" src={cartridge.logo.lockup} alt={cartridge.name} width={174} height={72} />
        </Link>
        <NavMenu />
        <div className="nav-tail">
          <ThemeLantern />
          {!underConsole && <BasketChip />}
          {/* TASK-185 Phase A prototype — the door chip: Log in opens the
              small sheet under the button; signed in, the name opens the
              member menu. FrenBadge stays in the tree, unreferenced (its
              retirement is a Phase B ruling — unowned file, untouched). */}
          <DoorButton />
        </div>
      </div>
    </header>
  );
}
