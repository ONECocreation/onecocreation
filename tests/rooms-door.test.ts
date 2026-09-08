import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { roomsDoorRedirect } from "@/lib/rooms-door";

describe("the rooms are for signed-in souls (middleware door)", () => {
  it("a signed-out visitor on a room goes to the sign-in door with ?next= back to the room", () => {
    expect(roomsDoorRedirect("/rooms/weekly-reading", false)).toBe("/login?next=%2Frooms%2Fweekly-reading");
    expect(roomsDoorRedirect("/live", false)).toBe("/login?next=%2Flive");
  });
  it("a session cookie opens the door; the page still verifies the session itself", () => {
    expect(roomsDoorRedirect("/rooms/weekly-reading", true)).toBeNull();
  });
  it("the /classes shelf and every other page stay public", () => {
    expect(roomsDoorRedirect("/classes", false)).toBeNull();
    expect(roomsDoorRedirect("/", false)).toBeNull();
    expect(roomsDoorRedirect("/store/meditations", false)).toBeNull();
  });
  it("the middleware matches exactly the rooms and /live, and reads the house cookie", () => {
    const src = readFileSync("src/middleware.ts", "utf8");
    expect(src).toContain('"/rooms/:path*"');
    expect(src).toContain('"/live"');
    expect(src).toContain('"pa-fren"');
    const auth = readFileSync("src/lib/fren-auth.ts", "utf8");
    expect(auth).toContain('FREN_COOKIE = "pa-fren"');
  });
});
