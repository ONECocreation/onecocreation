import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * T-455 (SECURITY, block 968,393): the member-session mint could forge a
 * studio invite. A member session is `<handle>.<space>.<exp>.<sig>` with sig
 * = HMAC(SEAT_SECRET, `<handle>|<space>|<exp>`); the studio invite was
 * `<exp>.<sig>` with sig = HMAC(SEAT_SECRET, `studio-invite|<room>|<exp>`).
 * Claim the tag "studio-invite" with space "<room>" and the session cookie's
 * exp + sig WERE a valid invite into Love's standing studio (verified end to
 * end by the T-453 security review). Three locks, each pinned here:
 *   1. the invite's MAC label is `studio-invite:v2` — no member payload can
 *      carry it (a handle never contains ":");
 *   2. the session mints sign a KNOWN space only (claim + door-switch);
 *   3. token labels are reserved handles.
 */

const ROOM = "onecocreation_studio";

beforeAll(() => {
  process.env.SEAT_SECRET = "t455-fixture-secret";
});

describe("THE FORGERY — a member token is never a studio invite", () => {
  it("a session minted for the tag 'studio-invite' with a room as its space does NOT verify as that room's invite", async () => {
    const { makeMemberToken } = await import("@/lib/member-auth");
    const { verifyStudioInvite } = await import("@/lib/studio/invite-token");
    const token = makeMemberToken("studio-invite", ROOM);
    const [, , exp, sig] = token.split(".");
    expect(verifyStudioInvite(ROOM, `${exp}.${sig}`)).toBe(false);
  });

  it("a real invite still opens its own room, and no other", async () => {
    const { mintStudioInvite, verifyStudioInvite } = await import("@/lib/studio/invite-token");
    const invite = mintStudioInvite(ROOM)!;
    expect(verifyStudioInvite(ROOM, invite)).toBe(true);
    expect(verifyStudioInvite("another_studio", invite)).toBe(false);
  });

  it("the invite's MAC label carries a ':' — a shape no member payload can take", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/lib/studio/invite-token.ts"), "utf8");
    expect(src).toContain('const INVITE_LABEL = "studio-invite:v2";');
    expect(src).not.toContain("hmac(`studio-invite|");
    const { validateHandle } = await import("@/lib/registry");
    expect(validateHandle("studio-invite:v2").ok).toBe(false);
  });
});

describe("the session mints sign a KNOWN space only", () => {
  it("normalizeSpace folds anything unknown (a room, a pipe) to the house space", async () => {
    const { normalizeSpace } = await import("@/lib/registry");
    const { SPACE_NAME } = await import("@/lib/identity-config");
    expect(normalizeSpace(ROOM)).toBe(SPACE_NAME);
    expect(normalizeSpace("x|accept")).toBe(SPACE_NAME);
    expect(normalizeSpace(SPACE_NAME)).toBe(SPACE_NAME);
  });

  it("the claim route and the door-switch both mint with the normalized space (source pins)", async () => {
    const claim = await fs.readFile(path.join(process.cwd(), "src/app/api/member/claim/route.ts"), "utf8");
    expect(claim).toMatch(/const space = normalizeSpace\(/);
    const session = await fs.readFile(path.join(process.cwd(), "src/app/api/member/session/route.ts"), "utf8");
    expect(session).toContain("const space = rawSpace ? normalizeSpace(rawSpace) : \"\";");
    expect(session).not.toMatch(/const space = \(body\.space/);
  });
});

describe("token labels are reserved handles", () => {
  it("studio-invite, studio-overlay, studio-room-key and offer can never be claimed", async () => {
    const { validateHandle } = await import("@/lib/registry");
    for (const h of ["studio-invite", "studio-overlay", "studio-room-key", "offer"]) {
      expect(validateHandle(h), h).toEqual({ ok: false, reason: "reserved name" });
    }
  });
});
