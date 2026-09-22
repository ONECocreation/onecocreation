import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * TASK-352 (OC UI kit, lane 4) — /me signed in becomes three tabs (Profile,
 * Calendar, Purchases) for BOTH member kinds, built from the lane-1 kit's
 * real `Tabs` (T-349, merged). Pin the model, not the render — this repo's
 * vitest.config.ts runs `environment: "node"`, no jsdom, no
 * `@testing-library/react` (Ground, the brief's own note): source-string
 * pins, the `door-first-screen.test.ts` / `tests/welcome-page.test.ts` /
 * `tests/me-signed-out.test.ts` idiom.
 */

const readSrc = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), "utf8");

describe("MeSwitch.tsx — imports every panel this lane restructures, by name (nothing quietly deleted)", () => {
  it("still imports MePanel, EmailMemberPanel, MemberQuickCards, ConstellationCard, plus the new MemberCalendar mount and the kit Tabs", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    expect(src).toContain('import MePanel from "./MePanel"');
    expect(src).toContain('import EmailMemberPanel from "./EmailMemberPanel"');
    expect(src).toContain('import MemberQuickCards from "./MemberQuickCards"');
    expect(src).toContain('import MemberCalendar from "./MemberCalendar"');
    expect(src).toContain('import ConstellationCard from "./ConstellationCard"');
    expect(src).toContain('import Tabs from "@/components/kit/Tabs"');
  });
});

describe("MeSwitch.tsx — the email branch is three tabs: Profile, Calendar, Purchases", () => {
  it("mounts EmailMemberPanel/MemberCalendar/MemberQuickCards under the three labels, scoped to the email branch only", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    const emailIdx = src.indexOf('kind === "email"');
    const keyReturnIdx = src.lastIndexOf("return (");
    expect(emailIdx).toBeGreaterThan(-1);
    expect(keyReturnIdx).toBeGreaterThan(emailIdx);
    const emailBlock = src.slice(emailIdx, keyReturnIdx);
    expect(emailBlock).toContain('label: "Profile"');
    expect(emailBlock).toContain('label: "Calendar"');
    expect(emailBlock).toContain('label: "Purchases"');
    expect(emailBlock).toContain("<EmailMemberPanel");
    expect(emailBlock).toContain("<MemberCalendar");
    expect(emailBlock).toContain("<MemberQuickCards");
  });
});

describe("MeSwitch.tsx — the key branch is the same three tabs, its own content", () => {
  it("mounts ConstellationCard + MePanel in Profile, MemberCalendar in Calendar, MemberQuickCards in Purchases", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    const keyReturnIdx = src.lastIndexOf("return (");
    expect(keyReturnIdx).toBeGreaterThan(-1);
    const keyBlock = src.slice(keyReturnIdx);
    expect(keyBlock).toContain('label: "Profile"');
    expect(keyBlock).toContain('label: "Calendar"');
    expect(keyBlock).toContain('label: "Purchases"');
    expect(keyBlock).toContain("<ConstellationCard");
    expect(keyBlock).toContain("<MePanel");
    expect(keyBlock).toContain("<MemberCalendar");
    expect(keyBlock).toContain("<MemberQuickCards");
  });

  it("tab state is controlled by the ?tab= param — useSearchParams present, validated against the three tab ids with a profile fallback, no defaultActive, no useState seeded from the param", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    expect(src).toContain("useSearchParams");
    expect(src).toContain('searchParams.get("tab")');
    expect(src).toMatch(/\["profile",\s*"calendar",\s*"purchases"\]/);
    expect(src).not.toContain("defaultActive=");
    expect(src).not.toMatch(/useState\([^)]*[Tt]ab/);
  });

  it("both Tabs instances are wired to the SAME active value and the SAME onChange handler — one mechanism, not two", () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    const emailIdx = src.indexOf('kind === "email"');
    const keyReturnIdx = src.lastIndexOf("return (");
    const emailBlock = src.slice(emailIdx, keyReturnIdx);
    const keyBlock = src.slice(keyReturnIdx);
    for (const block of [emailBlock, keyBlock]) {
      expect(block).toContain("active={activeTab}");
      expect(block).toContain("onChange={handleTabChange}");
    }
  });
});

describe("src/app/me/calendar/page.tsx — the old address is a forward now, not a recreation (TASK-405, E4)", () => {
  it('calls permanentRedirect("/me?tab=calendar") and mounts no MemberCalendar', () => {
    const src = readSrc("src", "app", "me", "calendar", "page.tsx");
    expect(src).toContain('permanentRedirect("/me?tab=calendar")');
    /* a comment may honestly name the retired mount (why it's gone) — the
       pin scans for the real thing: the import and the JSX tag */
    expect(src).not.toContain('from "@/components/me/MemberCalendar"');
    expect(src).not.toContain("<MemberCalendar");
  });
});

describe("MeSwitch.tsx — the boundary marker tests/me-signed-out.test.ts slices on stays load-bearing", () => {
  it('the literal string kind === "email" appears exactly once, after the error/signed-out branches, before the email/key split', () => {
    const src = readSrc("src", "components", "me", "MeSwitch.tsx");
    const hits = src.split('kind === "email"').length - 1;
    expect(hits).toBe(1);
    const errorIdx = src.indexOf('kind === "error"');
    const signedOutIdx = src.indexOf('kind === "signed-out"');
    const emailIdx = src.indexOf('kind === "email"');
    expect(errorIdx).toBeGreaterThan(-1);
    expect(signedOutIdx).toBeGreaterThan(errorIdx);
    expect(emailIdx).toBeGreaterThan(signedOutIdx);
  });
});

describe("EmailMemberPanel.tsx — sheds its own purchases/quick-doors cards (Build item 6: MemberQuickCards carries that now, for both member kinds)", () => {
  it("no longer renders a standalone 'Your purchases' or 'Quick doors' card", () => {
    const src = readSrc("src", "components", "me", "EmailMemberPanel.tsx");
    expect(src).not.toContain("Your purchases");
    expect(src).not.toContain("Quick doors");
  });

  it("still mounts the welcome card whole — the display-name save form and ConstellationCard's refreshKey wiring, unchanged", () => {
    const src = readSrc("src", "components", "me", "EmailMemberPanel.tsx");
    expect(src).toContain("<ConstellationCard refreshKey={profileVersion} />");
    expect(src).toMatch(/const \[profileVersion, setProfileVersion\] = useState\(0\);/);
    expect(src).toContain("saveName");
  });
});

describe("MemberQuickCards.tsx — the stale 'community calendar lands here next' line is gone (Build item 7)", () => {
  it("no longer promises a calendar that already exists one tab over", () => {
    const src = readSrc("src", "components", "me", "MemberQuickCards.tsx");
    expect(src).not.toContain("The community calendar lands here next");
  });

  it("mounted for both member kinds — its own docblock says so plainly now, not stale", () => {
    const src = readSrc("src", "components", "me", "MemberQuickCards.tsx");
    expect(src).toContain("BOTH member kinds");
  });
});

describe("No 'link a key' affordance anywhere this lane touches (RULED, the Admiral — out of this lane entirely)", () => {
  it("MeSwitch.tsx, EmailMemberPanel.tsx, and MemberQuickCards.tsx carry no such copy", () => {
    for (const rel of ["MeSwitch.tsx", "EmailMemberPanel.tsx", "MemberQuickCards.tsx"]) {
      const src = readSrc("src", "components", "me", rel);
      expect(src.toLowerCase()).not.toContain("link a key");
    }
  });
});
