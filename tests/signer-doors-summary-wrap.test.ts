import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* T-317 (0018.06.25 a₿): the two signer-door summary lines wrap on a phone.
   T-316 put SignerDoors on the sign-in path; at 390px the "remote signer ·
   works on iPhone + any browser" label clipped at the card's right edge. */
const src = readFileSync(resolve(__dirname, "../src/components/SignerDoors.tsx"), "utf8");

describe("the signer doors' summary lines", () => {
  const summaries = src.match(/<summary className[^>]*>/g) ?? [];
  it("there are exactly the two doors", () => {
    expect(summaries.length).toBe(2);
  });
  it("each summary is allowed to wrap (never clips at the card edge)", () => {
    for (const tag of summaries) expect(tag).toMatch(/whiteSpace: "normal"/);
  });
});
