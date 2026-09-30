import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { letterAudienceGate } from "@/lib/letters";

/** TASK-535: a signed-in member session (any tier, including none) reads a
 *  members letter; signed-out still gets the plain 404; operator and public
 *  are unchanged; the empty mailbox greets a member warmly. */
describe("free members read their letters (T-535)", () => {
  it("signed-in with no tier renders a members letter", () => {
    expect(letterAudienceGate({ audience: "members", signedIn: true, operator: false })).toBe("render");
  });
  it("signed-out members letter is still not-found", () => {
    expect(letterAudienceGate({ audience: "members", signedIn: false, operator: false })).toBe("not-found");
  });
  it("operator and public are unchanged", () => {
    expect(letterAudienceGate({ audience: "members", signedIn: false, operator: true })).toBe("render");
    expect(letterAudienceGate({ audience: "public", signedIn: false, operator: false })).toBe("render");
  });
  it("the page no longer reads a tier and metadata still follows the gate", () => {
    const src = readFileSync("src/app/letters/[key]/page.tsx", "utf8");
    expect(src).not.toContain("member-tier");
    const meta = src.slice(src.indexOf("export async function generateMetadata"), src.indexOf("export default"));
    expect(meta).toContain("letterGate(");
  });
  it("the reading room greets an empty mailbox with a community welcome", () => {
    const src = readFileSync("src/components/LettersRoom.tsx", "utf8");
    expect(src).toContain("Welcome to the community");
    expect(src).not.toContain("—".repeat(1) + " when Love publishes her next letter, it lands here too.");
  });
});
