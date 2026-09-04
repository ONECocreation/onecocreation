"use client";

import type { Data } from "@puckeditor/core";
import { config } from "@/lib/puck-config";
import { SEEDS } from "@/lib/puck-seeds";
import { ONECOCREATION } from "@/brand/tokens";
import Copilot from "@/components/Copilot";
import PuckEditor from "@/components/PuckEditor";

/**
 * StudioEditor — the studio page's WIRING BRIDGE (TASK-97 prop-lift, cut
 * 0018.06.10 a₿). PuckEditor is brand-neutral: puck-config, the seed
 * library, the brand tokens and the Copilot arrive as props. They enter
 * HERE, at the first client boundary under the server page, because the
 * RSC serializer can't carry config's render functions across the
 * server→client seam — and passing the seed library from the server would
 * inline it into every studio flight payload. A second StudioPac tenant
 * forks this one file (its own config/seeds/tokens/Copilot), never the
 * editor. The prop contract toward the page is the one PuckEditor always
 * had: { slug, data }.
 */
export default function StudioEditor({ slug, data }: { slug: string; data: Data }) {
  return (
    <PuckEditor
      slug={slug}
      data={data}
      config={config}
      seeds={SEEDS}
      tokens={ONECOCREATION}
      Copilot={Copilot}
    />
  );
}
