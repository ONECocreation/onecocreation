import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Button from "@/components/kit/Button";
import Card from "@/components/kit/Card";
import Field from "@/components/kit/Field";
import Tabs, { nextTabIndex } from "@/components/kit/Tabs";

/**
 * TASK-349 (lane 1, the OC UI kit) — pins for Button/Card/Field/Tabs and
 * the scene.ts serif fix. Environment is `node` (no jsdom in this repo's
 * vitest config, tests/**\/*.test.ts only — see tests/operator-gate-
 * email-seat.test.ts's note): the class-name/CSS law is pinned by reading
 * the source, exactly like every other CSS pin in this house
 * (tests/about-featured.test.ts's renderToStaticMarkup convention covers
 * markup shape; keyboard behavior is pinned on the pure `nextTabIndex`
 * helper Tabs exports for exactly this reason — no DOM keydown to
 * dispatch under `environment: "node"`).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");

describe("kit.css — Button never wraps its label (R-071), every variant", () => {
  let css: string;
  it("loads kit.css", async () => {
    css = await read("src/app/kit.css");
    expect(css.length).toBeGreaterThan(0);
  });

  it("the shared .kit-btn base carries white-space:nowrap unconditionally", async () => {
    css = await read("src/app/kit.css");
    const base = css.match(/\.kit-btn\{[^}]*\}/)?.[0] ?? "";
    expect(base).toContain("white-space:nowrap");
  });

  it("main/second/quiet variant classes exist (the base's nowrap covers them; none re-declares white-space:normal)", async () => {
    css = await read("src/app/kit.css");
    for (const cls of [".kit-btn-main", ".kit-btn-second", ".kit-btn-quiet", ".kit-btn-sm"]) {
      expect(css, `${cls} missing from kit.css`).toContain(cls);
    }
    expect(css).not.toMatch(/\.kit-btn[^{]*\{[^}]*white-space:\s*normal/);
  });

  it("the stack law: .kit-btn-row is a flex-wrap row (no wrapping media query needed — flex-wrap + nowrap items stack on their own)", async () => {
    css = await read("src/app/kit.css");
    const row = css.match(/\.kit-btn-row\{[^}]*\}/)?.[0] ?? "";
    expect(row).toContain("display:flex");
    expect(row).toContain("flex-wrap:wrap");
  });
});

describe("kit Button component", () => {
  it("renders variant + sm class names, and defaults to variant=main", () => {
    const main = renderToStaticMarkup(createElement(Button, {}, "Go"));
    expect(main).toContain("kit-btn");
    expect(main).toContain("kit-btn-main");

    const second = renderToStaticMarkup(createElement(Button, { variant: "second" }, "Go"));
    expect(second).toContain("kit-btn-second");

    const quiet = renderToStaticMarkup(createElement(Button, { variant: "quiet" }, "Go"));
    expect(quiet).toContain("kit-btn-quiet");

    const sm = renderToStaticMarkup(createElement(Button, { sm: true }, "Go"));
    expect(sm).toContain("kit-btn-sm");
  });

  it("never renders type=submit by accident — a bare kit Button defaults to type=button", () => {
    const html = renderToStaticMarkup(createElement(Button, {}, "Go"));
    expect(html).toContain('type="button"');
  });
});

describe("kit Card component — the outer shell only", () => {
  it("renders the kit-card shell class and wraps children in kit-card-body by default", () => {
    const html = renderToStaticMarkup(createElement(Card, {}, "hello"));
    expect(html).toContain("kit-card");
    expect(html).toContain("kit-card-body");
    expect(html).toContain("hello");
  });

  it("body=false skips the padding wrapper", () => {
    const html = renderToStaticMarkup(createElement(Card, { body: false }, "hello"));
    expect(html).not.toContain("kit-card-body");
  });
});

describe("kit Field component — bound label, input, error slot", () => {
  it("binds the label to the input via htmlFor/id", () => {
    const html = renderToStaticMarkup(createElement(Field, { id: "email", label: "Email" }));
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain(">Email<");
  });

  it("no error passed → no error slot, no aria-describedby", () => {
    const html = renderToStaticMarkup(createElement(Field, { id: "email", label: "Email" }));
    expect(html).not.toContain("kit-field-error");
    expect(html).not.toContain("aria-describedby");
  });

  it("an error renders the error text AND wires aria-describedby (never color alone)", () => {
    const html = renderToStaticMarkup(
      createElement(Field, { id: "email", label: "Email", error: "That doesn't look like an email address." }),
    );
    expect(html).toContain('aria-describedby="email-error"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain("That doesn&#x27;t look like an email address.");
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
  });
});

describe("kit Tabs component — real ARIA tablist", () => {
  const items = [
    { id: "a", label: "Alpha", content: "alpha content" },
    { id: "b", label: "Bravo", content: "bravo content" },
    { id: "c", label: "Charlie", content: "charlie content" },
  ];

  it("renders role=tablist, role=tab per item, aria-selected, and role=tabpanel", () => {
    const html = renderToStaticMarkup(createElement(Tabs, { items }));
    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(3);
    expect((html.match(/role="tabpanel"/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
  });

  it("the first tab is active by default (uncontrolled); roving tabindex on the tabs", () => {
    const html = renderToStaticMarkup(createElement(Tabs, { items }));
    expect(html).toContain("kit-tab-active");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
  });

  it("a controlled `active` prop overrides the default", () => {
    const html = renderToStaticMarkup(createElement(Tabs, { items, active: "b" }));
    const bravoTab = html.match(/<button[^>]*>Bravo<\/button>/)?.[0] ?? "";
    expect(bravoTab).toContain('aria-selected="true"');
  });

  it("id/aria-controls pairing: each tab's aria-controls matches a real tabpanel id", () => {
    const html = renderToStaticMarkup(createElement(Tabs, { items }));
    const controlsIds = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
    for (const id of controlsIds) {
      expect(html, `no tabpanel with id=${id}`).toContain(`id="${id}"`);
    }
  });
});

describe("nextTabIndex — the arrow-key law, pure (testable with no DOM)", () => {
  it("ArrowRight/ArrowDown move forward and wrap past the last tab", () => {
    expect(nextTabIndex(0, "ArrowRight", 3)).toBe(1);
    expect(nextTabIndex(2, "ArrowRight", 3)).toBe(0);
    expect(nextTabIndex(0, "ArrowDown", 3)).toBe(1);
  });

  it("ArrowLeft/ArrowUp move backward and wrap past the first tab", () => {
    expect(nextTabIndex(1, "ArrowLeft", 3)).toBe(0);
    expect(nextTabIndex(0, "ArrowLeft", 3)).toBe(2);
    expect(nextTabIndex(1, "ArrowUp", 3)).toBe(0);
  });

  it("Home/End jump to the first/last tab", () => {
    expect(nextTabIndex(1, "Home", 3)).toBe(0);
    expect(nextTabIndex(1, "End", 3)).toBe(2);
  });

  it("any other key is a no-op", () => {
    expect(nextTabIndex(1, "Tab", 3)).toBe(1);
    expect(nextTabIndex(1, "a", 3)).toBe(1);
  });

  it("zero tabs never throws or moves", () => {
    expect(nextTabIndex(0, "ArrowRight", 0)).toBe(0);
  });
});

describe("TASK-349 — the canvas serif leak, fixed", () => {
  it("scene.ts carries no serif font anywhere", async () => {
    const src = await read("src/lib/bb/scene.ts");
    expect(src.toLowerCase()).not.toContain("serif");
  });

  it("the one ctx.font call now uses a plain sans stack", async () => {
    const src = await read("src/lib/bb/scene.ts");
    expect(src).toContain('ctx.font = "26px -apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif";');
  });
});

describe("TASK-349 — the pre-allowed seam: kit.css joins the contrast sweep", () => {
  it("scripts/check-usability.mjs's CSS_SWEEP_FILES now lists src/app/kit.css", async () => {
    const src = await read("scripts/check-usability.mjs");
    const arr = src.match(/const CSS_SWEEP_FILES = \[[\s\S]*?\];/)?.[0] ?? "";
    expect(arr).toContain('"src/app/kit.css"');
  });
});

describe("TASK-349 — the root layout imports kit.css after house.css", () => {
  it("src/app/layout.tsx imports ./kit.css, positioned after ./house.css", async () => {
    const src = await read("src/app/layout.tsx");
    expect(src).toContain('import "./kit.css";');
    expect(src.indexOf('import "./house.css";')).toBeLessThan(src.indexOf('import "./kit.css";'));
  });
});
