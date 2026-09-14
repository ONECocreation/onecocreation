import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-255 (0018.06.24 a₿ — the Admiral: "the white square buttons were
 * supposed to be replaced with the pink gradient ones, like you see in the
 * home page. we also had a shimmer effect … can that get added back and
 * have all of those square type buttons unified with that pink gradient
 * with shimmer").
 *
 * The BASE flips: `.btn` in house.css becomes the rose gradient + plum ink
 * (the exact `.btn-rose` T-121 paint) AND carries the shimmer sweep (moved
 * up from `.btn-shimmer`, which is now a harmless no-op alias so old
 * markup and any string match still holds). Overrides that keep their own
 * paint — `.btn-gold` (money), `.btn-ghost`, `.btn-teal`, `.btn-on`,
 * `.btn-quiet`, `.btn-round` — get `::after{content:none}`, so the sweep
 * stays a PRIMARY-door signal, not a blanket animation. The /a console
 * (SiteConsoleShell's `.mgmt-shell` wrapper — bare `.mgmt-body` is shared
 * with public single-card pages, so it is NOT the right scope) gets the
 * pink base with no shimmer, one calm dialect.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const HOUSE_CSS = "src/app/house.css";

/* the public surface, per the scout (~/dev/home/outbox/scout-buttons-
   0018.06.24.md) — CSS files a regression could slip a NEW bare white
   `.btn` paint into, outside the console's own directories */
const PUBLIC_CSS_FILES = [
  "src/app/house.css",
  "src/app/globals.css",
  "src/app/cartridge.css",
  "src/app/cartridges.css",
  "src/app/scar.css",
  "src/lib/puck-blocks/parallax.css",
  "src/app/style/preview.css",
  "src/app/style/puck-theme.css",
  "src/app/style/studio-tokens.css",
  "src/components/calendar/calendar-view.css",
  "src/components/rooms/classroom.css",
];

describe("TASK-255 — the .btn base flips to pink + shimmer", () => {
  it(".btn's own rule carries the T-121 rose gradient + --rose-btn-ink, not white", async () => {
    const css = await read(HOUSE_CSS);
    const btnRule = css.match(/(?<!-)\.btn\{[\s\S]*?\}/)?.[0] ?? "";
    expect(btnRule).not.toBe("");
    expect(btnRule).toMatch(/background:linear-gradient\(135deg,#E7B2C3,#C56E8B\)/);
    expect(btnRule).toMatch(/color:var\(--rose-btn-ink\)/);
    expect(btnRule).not.toMatch(/background:#fff/);
  });

  it(".btn is position:relative;overflow:hidden and carries its own ::after shimmer sweep", async () => {
    const css = await read(HOUSE_CSS);
    const btnRule = css.match(/(?<!-)\.btn\{[\s\S]*?\}/)?.[0] ?? "";
    expect(btnRule).toMatch(/position:relative/);
    expect(btnRule).toMatch(/overflow:hidden/);

    const afterRule = css.match(/(?<!-)\.btn::after\{[\s\S]*?\}/)?.[0] ?? "";
    expect(afterRule).not.toBe("");
    expect(afterRule).toMatch(/content:""/);
    expect(afterRule).toMatch(/animation:rose-shimmer/);
  });

  it("prefers-reduced-motion still stills the sweep on .btn::after", async () => {
    const css = await read(HOUSE_CSS);
    const reduceBlock = css.match(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.shine-hover:hover::before\{animation:none;opacity:\.6\}\s*\}/)?.[0] ?? "";
    expect(reduceBlock).toMatch(/\.btn::after\{animation:none\}/);
  });

  it(".btn-shimmer is a no-op alias — no properties of its own", async () => {
    const css = await read(HOUSE_CSS);
    const rule = css.match(/\.btn-shimmer\{[^}]*\}/)?.[0] ?? "";
    expect(rule).toBe(".btn-shimmer{}");
    // and it never regains its own ::after rule
    expect(css).not.toMatch(/\.btn-shimmer::after\{/);
  });

  it("the six paint overrides — gold, ghost, teal, on, quiet, round — kill the sweep with ::after{content:none}", async () => {
    const css = await read(HOUSE_CSS);
    const rule = css.match(/\.btn-gold::after,\.btn-ghost::after,\.btn-teal::after,\.btn-on::after,\.btn-quiet::after,\.btn-round::after\{content:none\}/);
    expect(rule).not.toBeNull();
  });

  it("gold is money only — .btn-gold keeps its own gold paint, untouched by the base flip", async () => {
    const css = await read(HOUSE_CSS);
    const goldRule = css.match(/\.btn-gold\{[\s\S]*?\}/)?.[0] ?? "";
    expect(goldRule).toMatch(/linear-gradient\(135deg,var\(--gold-2\),var\(--gold\)\)/);
    expect(goldRule).toMatch(/color:var\(--gold-ink\)/);
  });

  it(".btn-rose stays declared as the same paint (the order-sensitive `btn btn-rose btn-sm` strings still resolve to rose)", async () => {
    const css = await read(HOUSE_CSS);
    const roseRule = css.match(/\.btn-rose\{[^}]*\}/)?.[0] ?? "";
    expect(roseRule).toMatch(/background:linear-gradient\(135deg,#E7B2C3,#C56E8B\)/);
    expect(roseRule).toMatch(/color:var\(--rose-btn-ink\)/);
  });

  it("the /a console kills the sweep at .mgmt-shell (SiteConsoleShell's own wrapper), not bare .mgmt-body (shared with public single-card pages)", async () => {
    const css = await read(HOUSE_CSS);
    expect(css).toMatch(/\.mgmt-shell \.btn::after\{content:none\}/);
    // guard the reasoning itself: a bare `.mgmt-body .btn::after{content:none}`
    // rule would also silence /live, /gift/[voucherId], /rooms/[slug]… — never add one
    expect(css).not.toMatch(/[^-]\.mgmt-body \.btn::after/);
  });

  it("no public CSS file (outside src/app/a, src/components/console) adds a NEW bare white paint (background:#fff) on a .btn", async () => {
    for (const rel of PUBLIC_CSS_FILES) {
      let css: string;
      try {
        css = await read(rel);
      } catch {
        continue; // file may not exist in every checkout state; skip, don't fail
      }
      const whiteBtn = css.match(/\.btn(?:-[a-z]+)?\{[^}]*background:#fff[^}]*\}/g) ?? [];
      expect(whiteBtn, `${rel} declares a white .btn paint`).toHaveLength(0);
    }
  });
});

describe("TASK-255 — utility toggles/copy buttons wear btn-ghost (+ btn-on when active), never bare .btn", () => {
  it("MemberCalendar.tsx: Week/Month view toggles are ghost with btn-on when selected", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    expect(src).toMatch(/className=\{`btn btn-sm btn-ghost\$\{view === "week" \? " btn-on" : ""\}`\}/);
    expect(src).toMatch(/className=\{`btn btn-sm btn-ghost\$\{view === "month" \? " btn-on" : ""\}`\}/);
  });

  it("MemberCalendar.tsx: the Location/Copied utility button is ghost with btn-on when copied", async () => {
    const src = await read("src/components/me/MemberCalendar.tsx");
    expect(src).toMatch(/className=\{`btn btn-sm btn-ghost\$\{copied === b\.bookingId \? " btn-on" : ""\}`\}/);
  });

  it("VantageSwitcher.tsx: Stage/Lesson Path/Events tabs are ghost with btn-on when selected (no more inline gold paint)", async () => {
    const src = await read("src/components/rooms/VantageSwitcher.tsx");
    expect(src).toMatch(/className=\{`btn btn-sm btn-ghost\$\{vantage === o\.id \? " btn-on" : ""\}`\}/);
    expect(src).not.toMatch(/linear-gradient\(135deg,var\(--gold-2\),var\(--gold\)\)/);
  });

  it("Kind0Doors.tsx + SignerDoors.tsx: Copy invite is ghost with btn-on when copied, Mint a connect invite is ghost", async () => {
    for (const file of ["src/components/Kind0Doors.tsx", "src/components/SignerDoors.tsx"]) {
      const src = await read(file);
      expect(src, file).toMatch(/className=\{`btn btn-sm btn-ghost\$\{copied \? " btn-on" : ""\}`\}/);
      expect(src, file).toContain('className="btn btn-sm btn-ghost" style={{ width: "100%", boxSizing: "border-box" }}');
      expect(src, file).toContain("Mint a connect invite");
    }
  });

  it("LessonPathView.tsx: mark done is ghost with btn-on when done", async () => {
    const src = await read("src/components/rooms/LessonPathView.tsx");
    expect(src).toMatch(/className=\{`btn btn-sm btn-ghost\$\{done\.has\(active\.sessionKey\) \? " btn-on" : ""\}`\}/);
  });

  it("every real DOOR in these five files keeps bare btn (untouched) — this was a targeted utility fix, not a blanket ghosting", async () => {
    // LessonPathView's sign-in / see-the-memberships doors stay bare btn
    const lessonPath = await read("src/components/rooms/LessonPathView.tsx");
    expect(lessonPath).toMatch(/className="btn btn-sm" href=\{signInDoorHref\(slug\)\}/);
    expect(lessonPath).toMatch(/className="btn btn-sm" href="\/memberships"/);
    // SignerDoors' real connect/open-app doors stay bare btn
    const signerDoors = await read("src/components/SignerDoors.tsx");
    expect(signerDoors).toMatch(/onClick=\{signBunker\}[\s\S]{0,100}className="btn btn-sm"/);
  });
});

describe("TASK-255 — one 'Get Started Today' string, not two", () => {
  it("memberships/page.tsx and services/page.tsx agree on the exact copy", async () => {
    const memberships = await read("src/app/memberships/page.tsx");
    const services = await read("src/app/services/page.tsx");
    expect(memberships).toMatch(/Get Started Today/);
    expect(services).toMatch(/Get Started Today/);
    expect(services).not.toMatch(/Get started today/);
  });
});

describe("TASK-255 — untouched files stay untouched (the brief's do-not-edit list)", () => {
  it("SubscribeForm.tsx, ServiceCard.tsx, EmailDoor.tsx, about-content.ts keep their exact btn-rose class strings", async () => {
    const subscribeForm = await read("src/components/SubscribeForm.tsx");
    expect(subscribeForm).toMatch(/`btn btn-rose\$\{label \? " btn-sm" : ""\}`/);

    const serviceCard = await read("src/components/ServiceCard.tsx");
    const roseDoors = serviceCard.match(/btn btn-sm btn-rose/g) ?? [];
    expect(roseDoors.length).toBe(2);

    const emailDoor = await read("src/components/EmailDoor.tsx");
    expect(emailDoor).toMatch(/EMAIL_CTA_CLASSNAME = "btn btn-rose"/);

    const aboutContent = await read("src/lib/about-content.ts");
    expect(aboutContent).toMatch(/ABOUT_PINK_DOOR = "btn btn-rose"/);
  });
});
