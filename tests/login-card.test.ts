import { describe, it, expect } from "vitest";
import {
  showSwitchDoor,
  EMAIL_CTA_CLASSNAME,
  SWITCH_DOOR_CLASSNAME,
  SWITCH_DOOR_LABEL,
} from "@/components/EmailDoor";

/**
 * TASK-155 (0018.06.17 a₿) — Love's meeting cut: "there isn't a button that
 * says already have a login; the Email me a code button should be pink and
 * match the site". These pins hold the card's derived contract — the door's
 * visibility rule and the exact classnames/copy that carry the color and
 * wording asks — the same "pin the model, not the render" pattern
 * store-cards.test.ts uses for the shelf card (this repo's tests run in a
 * node environment with no DOM, so the component itself is never rendered).
 */
describe("EmailDoor — the 'already have a login' door (T-155)", () => {
  it("shows only on the email step, and only when LoginPanel wired a handler", () => {
    expect(showSwitchDoor("email", true)).toBe(true);
  });

  it("hides once a caller wired no handler (the bare /welcome usage — a brand-new fren has no login to switch to)", () => {
    expect(showSwitchDoor("email", false)).toBe(false);
  });

  it("hides mid-verify — switching identity after a code is in flight would strand it", () => {
    expect(showSwitchDoor("code", true)).toBe(false);
  });

  it("hides once the fren is already in", () => {
    expect(showSwitchDoor("done", true)).toBe(false);
  });

  it("the door carries the Admiral's exact copy", () => {
    expect(SWITCH_DOOR_LABEL).toBe("Already have a login? Sign in");
  });

  it("the primary CTA rides the house pink door — .btn-rose, the pair T-121 already proved ≥4.5:1 in both themes", () => {
    expect(EMAIL_CTA_CLASSNAME.split(" ")).toEqual(expect.arrayContaining(["btn", "btn-rose"]));
  });

  it("the switch door rides beside it at the same .btn rhythm, ghost-filled and small so the pink stays the one loud door", () => {
    expect(SWITCH_DOOR_CLASSNAME.split(" ")).toEqual(expect.arrayContaining(["btn", "btn-ghost", "btn-sm"]));
  });
});
