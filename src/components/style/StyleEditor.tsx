"use client";

import type { Data } from "@puckeditor/core";
import type { ReactNode } from "react";
import { config } from "@/lib/puck-config";
import { SEEDS } from "@/lib/puck-seeds";
import { ONECOCREATION } from "@/brand/tokens";
import Copilot from "@/components/Copilot";
import PuckEditor from "@/components/PuckEditor";

/**
 * StyleEditor — the style page's WIRING BRIDGE (TASK-97 prop-lift, cut
 * 0018.06.10 a₿; renamed StudioEditor → StyleEditor by TASK-175,
 * 0018.06.17 a₿ — the page designer is Style). PuckEditor is
 * brand-neutral: puck-config, the seed library, the brand tokens and the
 * Copilot arrive as props. They enter HERE, at the first client boundary
 * under the server page, because the RSC serializer can't carry config's
 * render functions across the server→client seam — and passing the seed
 * library from the server would inline it into every style flight payload.
 * A second StylePac tenant forks this one file (its own
 * config/seeds/tokens/Copilot), never the editor. The prop contract toward
 * the page is the one PuckEditor always had: { slug, data }, plus `operator`
 * (TASK-342) — the already-gated signed-in operator, forwarded straight
 * through so PuckEditor can name them on the canvas — and now
 * `previewHero` (TASK-346 LANE A) — the locked preview hero, ALREADY
 * RENDERED server-side by the route (src/app/style/[[...slug]]/page.tsx,
 * `<Hero session={session}/>`, option 1's session resolution) and passed
 * down as an opaque ReactNode. Rendering it up there rather than here
 * keeps `sections.tsx`'s server-only import graph (booking/store/
 * site-config → fs/redis/nodemailer) out of this client bundle entirely —
 * a real `next build` failure found while building this lane, documented
 * in full at the route file and in SUMMARY.md.
 */
export default function StyleEditor({ slug, data, operator, previewHero }: { slug: string; data: Data; operator: string; previewHero: ReactNode }) {
  return (
    <PuckEditor
      slug={slug}
      data={data}
      config={config}
      seeds={SEEDS}
      tokens={ONECOCREATION}
      Copilot={Copilot}
      operator={operator}
      previewHero={previewHero}
    />
  );
}
