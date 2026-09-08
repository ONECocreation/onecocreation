import { describe, it, expect } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-123 (0018.06.16 a₿): the four restored classroom layouts — Video,
 * Materials, People, Stage — one render test each, asserting the three
 * regions Love named ("video, materials, people") exist in each layout's
 * markup. Static server markup (no DOM runner in this house — vitest stays
 * node-environment, the runner TASK-105 landed): the client components'
 * first paint is the honest region skeleton; the feeds hydrate after.
 *
 * The regions carry `data-region="video|materials|people"` markers so this
 * contract is structural, not copy-matching.
 */

interface LayoutProps {
  slug: string;
  alias: string;
  title: string;
  /* TASK-149 minimal-forced-edit (justification: StageView's props grew
   * `kind` for the StageChat→RoomView wiring; this shared fixture must
   * carry it or tsc fails on the Stage import below) */
  kind: "class" | "community";
  live: boolean;
}

const PROPS: LayoutProps = {
  slug: "heart-field",
  alias: "#heart-field:onecocreation.local",
  title: "Heart Field",
  kind: "community",
  live: false,
};

const LAYOUTS: [string, () => Promise<{ default: ComponentType<LayoutProps> }>][] = [
  ["Video", () => import("@/components/rooms/VideoView")],
  ["Materials", () => import("@/components/rooms/MaterialsView")],
  ["People", () => import("@/components/rooms/PeopleView")],
  ["Stage", () => import("@/components/rooms/StageView")],
];

describe("the four restored classroom layouts", () => {
  for (const [name, load] of LAYOUTS) {
    it(`${name}: video, materials, and people regions all render`, async () => {
      const View = (await load()).default;
      const html = renderToStaticMarkup(createElement(View, PROPS));
      for (const region of ["video", "materials", "people"]) {
        expect(html, `${name} is missing the ${region} region`).toContain(`data-region="${region}"`);
      }
    });
  }

  it("the video slot raises the gold live door only when the room is live", async () => {
    const View = (await import("@/components/rooms/VideoView")).default;
    const dark = renderToStaticMarkup(createElement(View, PROPS));
    expect(dark).not.toContain("Join Live Session");
    const lit = renderToStaticMarkup(createElement(View, { ...PROPS, live: true }));
    expect(lit).toContain("Join Live Session");
  });
});
