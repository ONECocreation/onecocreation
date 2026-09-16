import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* T-315 (0018.06.25 a₿): the door's FIRST screen no longer grabs the keyboard.
   The email field carried `autoFocus`, so on a phone the keyboard rose before
   the visitor chose a path and pushed the key door under it (T-314 bench,
   friction #1 — two builders found it independently). The code screen and the
   name screen keep their autofocus: by then the visitor has chosen. */
const src = readFileSync(resolve(__dirname, "../src/components/door/DoorSheet.tsx"), "utf8");

describe("the sign-in door's first screen", () => {
  it("the email field on the first screen does not autofocus", () => {
    const emailInput = src.match(/<input\s+type="email"[^>]*>/)?.[0];
    expect(emailInput, "the email input still exists").toBeTruthy();
    expect(emailInput).not.toMatch(/autoFocus/);
  });
  it("the code field and the name field still autofocus (the visitor has chosen by then)", () => {
    expect(src).toMatch(/inputMode="numeric"[^>]*autoFocus/);
    expect(src).toMatch(/autoFocus value=\{wish\}/);
  });
});
