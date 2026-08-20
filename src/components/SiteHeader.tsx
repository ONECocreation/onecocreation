import Link from "next/link";
import FrenBadge from "./FrenBadge";
import ThemeLantern from "./ThemeLantern";
import NavMenu from "./NavMenu";
import BasketChip from "./BasketChip";
import { cartridge } from "@/brand/cartridge";

/** Dark celestial header, true to One Cocreation's brand mark. */
export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="bar">
        <a href="/" className="logo">
          {/* The full lockup Love uses on her live site — rendered at its own
              aspect (1235×533), never squeezed into a square. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brandmark-lockup" src={cartridge.logo.lockup} alt={cartridge.name} width={174} height={72} />
        </a>
        <NavMenu />
        <div className="nav-tail">
          <ThemeLantern />
          <BasketChip />
          <FrenBadge />
        </div>
      </div>
    </header>
  );
}
