import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_POPUP_TRIGGERS,
  popupShouldFireOn,
} from "@/lib/puck-popups";
import { SEEDS } from "@/lib/puck-seeds";

/**
 * TASK-216 (0018.06.23 a₿, #14 — "the free-meditation pop-up did not
 * appear on the home page"). Audited every OC-owned piece of the chain:
 * the mount (`<PopupHost/>` in src/app/page.tsx, unconditional), the
 * default trigger (`DEFAULT_POPUP_TRIGGERS["free-guide"]`, already lists
 * "/"), the seed document (`SEEDS["popup:free-guide"]`, already has
 * content), and the operator panel (PopupsPanel.tsx, always writes a
 * complete 4-field trigger — no partial-merge risk in
 * mergedPopupTriggers). No OC-owned code defect found. The one concrete,
 * testable improvement: the match condition itself, pulled out of
 * PopupHost's client effect into `popupShouldFireOn()` so "test the
 * trigger condition" (the brief's own words) is literal.
 *
 * If it is STILL not firing on the live site, the remaining place to look
 * is the KV override for "free-guide" (edited from the Style→Popups
 * panel) — outside what static code can verify, and outside this lane's
 * OWNS (never touches the live vault).
 */
const root = process.cwd();
const read = (rel: string) => fs.readFile(path.join(root, rel), "utf8");

describe("TASK-216 — the free-meditation pop-up's trigger condition, named and pinned", () => {
  it("popupShouldFireOn fires exactly when enabled AND the path is listed", () => {
    const t = { enabled: true, delayMs: 2000, oncePerSession: true, pages: ["/", "/about"] };
    expect(popupShouldFireOn(t, "/")).toBe(true);
    expect(popupShouldFireOn(t, "/about")).toBe(true);
    expect(popupShouldFireOn(t, "/classes")).toBe(false);
    expect(popupShouldFireOn({ ...t, enabled: false }, "/")).toBe(false);
    expect(popupShouldFireOn(undefined, "/")).toBe(false);
  });

  it("DEFAULT_POPUP_TRIGGERS['free-guide'] fires on the home page, as designed", () => {
    const t = DEFAULT_POPUP_TRIGGERS["free-guide"];
    expect(t).toBeTruthy();
    expect(popupShouldFireOn(t, "/")).toBe(true);
  });

  it("the seed document for free-guide exists and has content — the popup never renders an empty card", () => {
    const doc = SEEDS["popup:free-guide"];
    expect(doc).toBeTruthy();
    expect(Array.isArray(doc.content) && doc.content.length).toBeTruthy();
  });

  it("the home page mounts PopupHost unconditionally — not behind a branch that can silently skip it", async () => {
    const src = await read("src/app/page.tsx");
    // exactly one JSX return in this file's single code path
    expect((src.match(/<PopupHost\s*\/>/g) ?? []).length).toBe(1);
  });

  it("PopupHost reads the match condition through the pure helper — the exact place the brief asked to be tested", async () => {
    const src = await read("src/components/PopupHost.tsx");
    expect(src).toMatch(/import \{ popupShouldFireOn \} from "@\/lib\/puck-popups";/);
    expect(src).toMatch(/popupShouldFireOn\(t, pathname\)/);
  });
});
