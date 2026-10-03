import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (...p: string[]) => readFileSync(path.join(__dirname, "..", ...p), "utf8");

describe("T-549 cancel confirm: the pair stacks on the right edge at every width", () => {
  const panel = read("src/components/me/MembershipPanel.tsx");
  const css = read("src/app/kit.css");
  it("the confirm cluster carries the stack class, Keep first (primary), Yes cancel second (quiet)", () => {
    const at = panel.indexOf("kit-rows-pair-stack");
    expect(at).toBeGreaterThan(0);
    const after = panel.slice(at);
    const keep = after.indexOf(">Keep my membership</Button>");
    const yes = after.indexOf(">Yes, cancel it</Button>");
    expect(keep).toBeGreaterThan(0);
    expect(yes).toBeGreaterThan(keep);
    expect(after.slice(0, keep)).not.toContain('variant="second"');
    expect(after.slice(keep, yes)).toContain('variant="second"');
  });
  it("the stack rule is a column of equal-width controls, no phone-only media query", () => {
    const rule = css.match(/\.kit-rows-pair-stack\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain("flex-direction:column");
    expect(rule![1]).toContain("align-items:stretch");
    expect(rule![1]).toContain("justify-self:end");
  });
});

describe("T-549 welcome card is the kit card", () => {
  const src = read("src/components/me/EmailMemberPanel.tsx");
  it("renders through the kit Card, with no literal glass of its own", () => {
    expect(src).toContain('import Card from "@/components/kit/Card"');
    expect(src).toContain('<Card className="kit-me-welcome"');
    expect(src).not.toContain("rgba(255,255,255,.55)");
    expect(src).not.toContain("const card: React.CSSProperties");
  });
});
