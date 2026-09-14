import type { Metadata } from "next";
import { cartridge } from "@/brand/cartridge";
import { isStudioScene, studioSceneKind } from "@/lib/studio/scenes";
import { overlayConfigured, verifyOverlayToken } from "@/lib/studio/overlay-token";
import { getStudioDoc } from "@/lib/studio/roster";
import { loadRunnerItems } from "@/lib/studio/runner";
import { domainForSpace, SPACE_NAME } from "@/lib/identity-config";
import OverlayStage from "@/components/studio-overlay/OverlayStage";
import FullScene from "@/components/studio-overlay/FullScene";

/**
 * /studio/overlay?scene=<solo|duo|phone|starting|brb|ending>&token=<signed>
 * (TASK-191, 0018.06.18 a₿ · block 966119; the three full-frame scenes
 * added TASK-244) — the 1920×1080 browser source OBS or VDO.Ninja's
 * "&website" source captures. No cookie rides there, so the gate is the
 * signed overlay token in the query (src/lib/studio/overlay-token.ts);
 * every word and colour is derived — site config, cartridge, catalogue,
 * calendar, the studio doc — nothing is hand-typed here. `studioSceneKind`
 * is the one branch point: "overlay" renders the transparent OverlayStage
 * over the real camera picture, "full" renders the opaque FullScene as
 * the whole frame.
 *
 * A wrong or missing key never renders the stage: the closed card says
 * why, in words the operator can act on (re-copy the URL from /a/studio).
 */

export const metadata: Metadata = {
  title: "Studio overlay",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function ClosedCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: cartridge.palette.space, color: cartridge.palette.cream,
      fontFamily: cartridge.fonts.display, fontSize: 28, fontWeight: 600,
      padding: 80, textAlign: "center", lineHeight: 1.5,
    }}>
      <p style={{ maxWidth: 900, margin: 0 }}>{children}</p>
    </div>
  );
}

export default async function StudioOverlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const scene = typeof sp.scene === "string" ? sp.scene : "";
  const token = typeof sp.token === "string" ? sp.token : "";

  if (!overlayConfigured()) {
    return <ClosedCard>The studio overlay is not configured on this deployment — the operator&apos;s seat secret is unset, so the overlay stays closed.</ClosedCard>;
  }
  if (!isStudioScene(scene)) {
    return <ClosedCard>No such scene. Copy the overlay URL from the studio room on the operator&apos;s desk — it carries the scene and its key together.</ClosedCard>;
  }
  if (!verifyOverlayToken(scene, token)) {
    return <ClosedCard>The overlay key doesn&apos;t match this scene. Copy the current URL from the studio room on the operator&apos;s desk.</ClosedCard>;
  }

  const doc = await getStudioDoc();
  /* derive-or-dash: an untyped show title lets the cartridge's own
     product name speak — never a blank top line */
  const showTitle = doc.showTitle || cartridge.copy.productName;
  const tokens = {
    rose: cartridge.palette.rose,
    gold: cartridge.palette.gold,
    cream: cartridge.palette.cream,
    space: cartridge.palette.space,
    teal: "var(--teal-bright, #8FD0D8)",
    displayFont: cartridge.fonts.display,
  };

  if (studioSceneKind(scene) === "full") {
    return (
      <FullScene
        scene={scene as "starting" | "brb" | "ending"}
        showTitle={showTitle}
        mark={cartridge.logo.mark}
        nebula={cartridge.hero.nebula}
        book="/images/reading-book.webp"
        startsAt={doc.startsAt}
        afterHoursLine={doc.afterHoursLine}
        /* the site's door, as words — derived (template-shaped, no OC
           literal), never a button (it's a picture on a stream) */
        membershipsWords={`${domainForSpace(SPACE_NAME)}/memberships`}
        tokens={tokens}
      />
    );
  }

  const items = await loadRunnerItems();
  return (
    <OverlayStage
      scene={scene}
      showTitle={showTitle}
      mark={cartridge.logo.mark}
      host={doc.host}
      guest={doc.guests[0] ?? null}
      items={items}
      tokens={tokens}
    />
  );
}
