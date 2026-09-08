import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CODE_DOOR_HELD,
  MAX_SENDS,
  SEND_WINDOW_S,
  sendVerdict,
} from "@/app/api/auth/email/code-door-limit";

/**
 * TASK-185 Phase B · K7 — real or bot: the code door's meter. Pin the
 * decision (pure) and the wiring (source pin) — the house pins the model,
 * not the render; the vault itself stays a dev/fixture concern.
 */
describe("the code door's meter (K7 — real or bot)", () => {
  it("allows up to MAX_SENDS in a window, then holds", () => {
    expect(sendVerdict(1)).toBe("allow");
    expect(sendVerdict(MAX_SENDS)).toBe("allow");
    expect(sendVerdict(MAX_SENDS + 1)).toBe("hold");
    expect(sendVerdict(100)).toBe("hold");
  });

  it("the window is the code's own ten-minute life; the cap is three sends", () => {
    expect(SEND_WINDOW_S).toBe(600);
    expect(MAX_SENDS).toBe(3);
  });

  it("the held answer is honest words, never a captcha", () => {
    expect(CODE_DOOR_HELD).toMatch(/too many codes/);
    expect(CODE_DOOR_HELD).not.toMatch(/captcha/i);
  });

  it("the start route meters every send and answers 429 on hold (source pin)", () => {
    const src = readFileSync(
      join(__dirname, "..", "src", "app", "api", "auth", "email", "start", "route.ts"),
      "utf8",
    );
    expect(src).toContain("countSend");
    expect(src).toContain("sendVerdict");
    expect(src).toContain("{ status: 429 }");
    /* the meter stands BEFORE the code is minted or the letter sent */
    expect(src.indexOf("countSend")).toBeLessThan(src.indexOf("mintCode(email)"));
    expect(src.indexOf("countSend")).toBeLessThan(src.indexOf("sendMail("));
  });
});
