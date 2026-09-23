import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-440 (block 968,222 — the Admiral: "the security leak is big. and
 * needs to be fixed." · "let's make it dark so no one gets the pssword.")
 * — THE STUDIO-KEY LEAK FIX. Three parts ship in ONE merge; any two
 * without the third leaves the leak open:
 *
 *  1. THE SIGNED INVITE — a signed-out `/meet/studio/<prefix>_studio?join=1`
 *     used to return Love's OWN keyed studio link to anyone on the
 *     internet (confirmed on production at block 968,220). Now a standing
 *     room opens for an operator or a verified 7-day invite ONLY; a member
 *     session alone never opens it; a registry outage never downgrades a
 *     locally protected room to ad-hoc admission.
 *  2. `/rooms` CARRIES NO KEY — every signed-in member (free Heart Field
 *     included) used to receive `roomKey` in the payload. The page derives
 *     NOTHING keyed now, in every rail, door and live state. Heart Field's
 *     VDO stage goes dark.
 *  3. THE ROTATION — `studio-room-key:v2:` retires every harvested v1 key
 *     in the same merge. SEAT_SECRET is never touched.
 *
 * RED first on `5828cd0`: the regression, the rejected tokens, the local
 * protection, DARK and the rotation all fail against the un-fixed tree.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/* the page reads next/headers (cookie + request origin); the cookie is
 *  settable per test so operator/member/signed-out each render for real */
let mockCookie: string | null = null;
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "cookie" ? mockCookie : null) }),
}));

/* the DARK proof's spy: any key-producing call on the /rooms page render
 *  is counted here. The wrapper CALLS THROUGH — behavior never changes. */
vi.mock("@/lib/live", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/live")>();
  return { ...mod, studioRoomKey: vi.fn(mod.studioRoomKey) };
});

const iso = isolateCwd("task-440-studio-key-leak-");
afterAll(() => iso.cleanup());

const SAVED: Record<string, string | undefined> = {};
for (const k of ["SEAT_SECRET", "OPERATOR_NPUBS", "MATRIX_BOT_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) {
  SAVED[k] = process.env[k];
}
afterAll(() => {
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const SECRET = "task-440-test-seat-secret";
const ROOM = "onecocreation_studio";
const HYPHEN_ROOM = "onecocreation-studio";

/** the v1 label, computed by hand — the rotation pin never imports it. */
const v1Key = (room: string) =>
  createHmac("sha256", SECRET).update(`studio-room-key:${room}`).digest("hex").slice(0, 12);
const v2Key = (room: string) =>
  createHmac("sha256", SECRET).update(`studio-room-key:v2:${room}`).digest("hex").slice(0, 12);

const CLOSED_WORDS = "This room opens with Love";
const CLOSED_WORDS_2 = "ask Love for a fresh one.";

type MeetPage = typeof import("@/app/meet/studio/[room]/page");
type InviteToken = typeof import("@/lib/studio/invite-token");

const mintInvite = async (room: string) => (await import("@/lib/studio/invite-token")).mintStudioInvite(room);

const renderMeet = async (room: string, q: Record<string, string>) => {
  const { default: MeetStudioPage } = (await import("@/app/meet/studio/[room]/page")) as MeetPage;
  return renderToStaticMarkup(
    await MeetStudioPage({ params: Promise.resolve({ room }), searchParams: Promise.resolve(q) }),
  );
};

const stubRoomsJson = (body: unknown, ok = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, json: async () => body })),
  );

const stubRoomsJsonThrows = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("registry unreachable");
    }),
  );

let operatorCookie: string;
let memberCookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.MATRIX_BOT_TOKEN;
  process.env.SEAT_SECRET = SECRET;

  /* the meeting rail reads vdo for the DARK renders (the worst case —
     the rail the leak rode); every other meeting field falls back to the
     same defaults production derives */
  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
  await fs.writeFile(
    path.join(process.cwd(), "data", "site-config.json"),
    JSON.stringify({ meeting: { rail: "vdo" } }),
  );

  /* a confirmed vdo-rail booking, file-driver seeded (the meet-studio
     harness's own fixture): the booking id IS the room id */
  await fs.mkdir(path.join(process.cwd(), "data", "booking-recs"), { recursive: true });
  await fs.writeFile(
    path.join(process.cwd(), "data", "booking-recs", "a297b0000000000000000001.json"),
    JSON.stringify({
      id: "a297b0000000000000000001",
      state: "confirmed",
      serviceId: "discovery",
      serviceTitle: "Discovery call with Love",
      customer: { name: "Ada" },
    }),
  );
  await fs.writeFile(
    path.join(process.cwd(), "data", "booking-config.json"),
    JSON.stringify({ services: [{ id: "discovery", meetingRail: { kind: "vdo" } }] }),
  );

  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
  const { makeMemberToken } = await import("@/lib/member-auth");
  memberCookie = `pa-fren=${makeMemberToken("ada", "onecocreation")}`;
});

afterEach(() => {
  mockCookie = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the leak is closed — the signed-out join path (RED on 5828cd0)", () => {
  it("registry DARK: signed-out join=1 gets the closed card — zero password=, no iframe, no key", async () => {
    stubRoomsJson(null, false);
    const html = await renderMeet(ROOM, { join: "1" });
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("password=");
    expect(html).not.toContain(v1Key(ROOM));
    expect(html).toContain(CLOSED_WORDS);
    expect(html).toContain(CLOSED_WORDS_2);
  });

  it("registry ANSWERS (the hyphen-typed entry): signed-out join=1 gets the closed card", async () => {
    stubRoomsJson({
      _comment: "the file's own comment key",
      "onecocreation-studio": { title: "Heart Field · the studio", note: "Love's weekly reading room" },
    });
    const html = await renderMeet(ROOM, { join: "1" });
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("password=");
    expect(html).not.toContain(v1Key(ROOM));
    expect(html).toContain(CLOSED_WORDS);
  });

  it("the hyphen registry room itself: signed-out join=1 gets the closed card", async () => {
    stubRoomsJson({
      "onecocreation-studio": { title: "Heart Field · the studio", note: "Love's weekly reading room" },
    });
    const html = await renderMeet(HYPHEN_ROOM, { join: "1" });
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("password=");
    expect(html).not.toContain(v1Key(HYPHEN_ROOM));
    expect(html).toContain(CLOSED_WORDS);
  });

  it("the closed card carries one kit home link and no pre-join form", async () => {
    stubRoomsJson(null, false);
    const html = await renderMeet(ROOM, { join: "1" });
    expect(html).toContain("kit-body");
    expect(html).toContain("kit-btn kit-btn-second kit-btn-sm");
    expect(html).not.toContain('name="join"');
    expect(html).not.toContain("invite=");
  });
});

describe("admission — one decision, invite or operator only (RED on 5828cd0)", () => {
  it("a valid invite opens the keyed frame — and the frame URL carries no invite=", async () => {
    stubRoomsJson(null, false);
    const invite = (await mintInvite(ROOM))!;
    expect(invite).toMatch(/^\d+\.[a-f0-9]{64}$/);
    const html = await renderMeet(ROOM, { join: "1", label: "Ada", invite });
    const srcVal = (html.match(/<iframe[^>]*src="([^"]+)"/) ?? [])[1]?.replace(/&amp;/g, "&") ?? "";
    expect(srcVal).toContain(`?room=${ROOM}`);
    expect(srcVal).toMatch(/&password=[0-9a-f]{12}&/);
    expect(srcVal).not.toContain("invite=");
  });

  it("an operator without an invite opens the frame", async () => {
    stubRoomsJson(null, false);
    mockCookie = operatorCookie;
    const html = await renderMeet(ROOM, { join: "1" });
    expect(html).toContain("<iframe");
    expect(html).toContain("password=");
  });

  it("an ordinary signed-in member without an invite gets the closed card — a session alone never opens a standing room", async () => {
    stubRoomsJson(null, false);
    mockCookie = memberCookie;
    const html = await renderMeet(ROOM, { join: "1" });
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("password=");
    expect(html).toContain(CLOSED_WORDS);
  });

  it("a token minted for a DIFFERENT room is closed — the binding holds", async () => {
    stubRoomsJson(null, false);
    const invite = (await mintInvite("onecocreation_reading_with_ada"))!;
    const html = await renderMeet(ROOM, { join: "1", invite });
    expect(html).not.toContain("<iframe");
    expect(html).toContain(CLOSED_WORDS);
  });

  it("an expired token is closed (the server clock only)", async () => {
    stubRoomsJson(null, false);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now());
      const invite = (await mintInvite(ROOM))!;
      vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000); // eight days on
      const html = await renderMeet(ROOM, { join: "1", invite });
      expect(html).not.toContain("<iframe");
      expect(html).toContain(CLOSED_WORDS);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a tampered exp, a tampered sig and a random string are each closed", async () => {
    stubRoomsJson(null, false);
    const invite = (await mintInvite(ROOM))!;
    const [exp, sig] = invite.split(".");
    for (const bad of [
      `${Number(exp) + 1}.${sig}`,
      `${exp}.${"0".repeat(64)}`,
      "not-a-token",
      `${exp}.${sig.toUpperCase()}`,
    ]) {
      const html = await renderMeet(ROOM, { join: "1", invite: bad });
      expect(html).not.toContain("<iframe");
      expect(html).toContain(CLOSED_WORDS);
    }
  });

  it("the closed page never echoes the refused token", async () => {
    stubRoomsJson(null, false);
    const html = await renderMeet(ROOM, { join: "1", invite: "123.abcdef" });
    expect(html).not.toContain("123.abcdef");
  });
});

describe("local protection during a registry outage (RED on 5828cd0)", () => {
  it("the registry fetch THROWS: the locally listed standing room still needs an invite — never a downgrade to ad-hoc admission", async () => {
    stubRoomsJsonThrows();
    const closed = await renderMeet(ROOM, { join: "1" });
    expect(closed).not.toContain("<iframe");
    expect(closed).not.toContain("password=");
    expect(closed).toContain(CLOSED_WORDS);

    const invite = (await mintInvite(ROOM))!;
    const open = await renderMeet(ROOM, { join: "1", invite });
    expect(open).toContain("<iframe");
  });
});

describe("the pre-join card and the token itself", () => {
  it("a verified invite survives Join: the pre-join form carries it as a hidden input", async () => {
    stubRoomsJson(null, false);
    const invite = (await mintInvite(ROOM))!;
    const html = await renderMeet(ROOM, { invite });
    expect(html).toContain('name="invite"');
    expect(html).toContain(`value="${invite}"`);
    expect(html).toContain('name="join" value="1"');
  });

  it("a standing room with no invite renders no pre-join form at all", async () => {
    stubRoomsJson(null, false);
    const html = await renderMeet(ROOM, {});
    expect(html).not.toContain("<form");
    expect(html).not.toContain('name="invite"');
  });

  it("an unverified token is never echoed into the form", async () => {
    stubRoomsJson(null, false);
    const other = (await mintInvite("onecocreation_reading_with_ada"))!;
    const html = await renderMeet(ROOM, { invite: other });
    expect(html).not.toContain(other);
  });

  it("round-trip, expiry boundary, missing secret, room binding, no request clock", async () => {
    const tok = (await import("@/lib/studio/invite-token")) as InviteToken;
    const invite = tok.mintStudioInvite(ROOM)!;
    expect(tok.verifyStudioInvite(ROOM, invite)).toBe(true);
    expect(tok.verifyStudioInvite("onecocreation_reading_with_ada", invite)).toBe(false);
    /* the boundary: AT exp still valid, one ms past refused */
    vi.useFakeTimers();
    try {
      const now = Date.now();
      vi.setSystemTime(now);
      const fresh = tok.mintStudioInvite(ROOM)!;
      const exp = Number(fresh.split(".")[0]);
      vi.setSystemTime(exp);
      expect(tok.verifyStudioInvite(ROOM, fresh)).toBe(true);
      vi.setSystemTime(exp + 1);
      expect(tok.verifyStudioInvite(ROOM, fresh)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
    /* verify takes no clock argument — the server clock only, never the request's */
    expect(tok.verifyStudioInvite.length).toBe(2);
    /* fail-closed with no secret */
    const saved = process.env.SEAT_SECRET;
    delete process.env.SEAT_SECRET;
    expect(tok.mintStudioInvite(ROOM)).toBeNull();
    expect(tok.verifyStudioInvite(ROOM, invite)).toBe(false);
    process.env.SEAT_SECRET = saved;
    /* whitespace-only secret reads as unset */
    process.env.SEAT_SECRET = "   ";
    expect(tok.mintStudioInvite(ROOM)).toBeNull();
    process.env.SEAT_SECRET = saved;
  });

  it("the token never equals or contains the room key (either label)", async () => {
    const invite = (await mintInvite(ROOM))!;
    expect(invite).not.toBe(v1Key(ROOM));
    expect(invite).not.toBe(v2Key(ROOM));
    expect(invite).not.toContain(v1Key(ROOM));
    expect(invite).not.toContain(v2Key(ROOM));
  });
});

describe("unchanged doors (RED on 5828cd0)", () => {
  it("a confirmed booking room still joins with no invite", async () => {
    stubRoomsJson(null, false);
    const html = await renderMeet("a297b0000000000000000001", { join: "1" });
    expect(html).toContain("<iframe");
  });

  it("an ad-hoc co-create room still joins with no invite (the name-is-the-capability residual, pinned as a decision)", async () => {
    stubRoomsJson(null, false);
    const html = await renderMeet("onecocreation_reading_with_ada", { join: "1" });
    expect(html).toContain("<iframe");
  });

  it("the normalized co-create name `studio` is reserved — it can never mint an unsigned co-create door", async () => {
    const { cocreateGuestDoor } = await import("@/app/a/live/go-live-room");
    const meeting = {
      jitsiDomain: "meet.onecocreation.com",
      jitsiPrefix: "onecocreation-",
      vdoRoomPrefix: "onecocreation",
      vdoHost: "vdo.onecocreation.com",
      siteOrigin: "https://onecocreation.test",
    };
    for (const name of ["studio", " Studio ", "STUDIO!!"]) {
      const door = cocreateGuestDoor("vdo", name, meeting);
      expect(door.reserved).toBe(true);
      expect(door.link).toBeNull();
    }
    const normal = cocreateGuestDoor("vdo", "reading with ada", meeting);
    expect(normal.reserved).toBe(false);
    expect(normal.link).toBe("https://onecocreation.test/meet/studio/onecocreation_reading_with_ada");
  });

  it("the reservation wears the ruled words and offers no unsigned copy action (source pin)", () => {
    const src = read("src/app/a/live/go-live-room.tsx");
    expect(src).toContain("That name is reserved for Love");
    expect(src).toContain("kit-text-quiet");
  });
});

describe("DARK — /rooms carries NO studio key (RED on 5828cd0)", () => {
  const renderRoom = async (slug: string, cookie: string | null) => {
    vi.resetModules();
    mockCookie = cookie;
    const { default: RoomPage } = await import("@/app/rooms/[slug]/page");
    return renderToStaticMarkup(await RoomPage({ params: Promise.resolve({ slug }) }));
  };

  it("rail vdo, door open, signed-in member on the free Heart Field: no password=, no key, zero key-derivation calls", async () => {
    stubRoomsJson(null, false); // any fetch (matrix dark anyway) gets a dead answer
    const { studioRoomKey } = await import("@/lib/live");
    const spy = vi.mocked(studioRoomKey);
    spy.mockClear();
    const html = await renderRoom("heart-field", memberCookie);
    expect(spy).not.toHaveBeenCalled();
    expect(html).not.toContain("password=");
    expect(html).not.toContain(v1Key(ROOM));
    expect(html).not.toContain(v2Key(ROOM));
    expect(html).not.toContain('"roomKey"');
  });

  it("a free member at a closed tier-C room: no key either", async () => {
    stubRoomsJson(null, false);
    const { studioRoomKey } = await import("@/lib/live");
    const spy = vi.mocked(studioRoomKey);
    spy.mockClear();
    const html = await renderRoom("inner-sanctum", memberCookie);
    expect(spy).not.toHaveBeenCalled();
    expect(html).not.toContain("password=");
    expect(html).not.toContain(v1Key(ROOM));
    expect(html).not.toContain(v2Key(ROOM));
  });

  it("the named-guest case: roster ok, the viewer is Love's named guest — the camera door carries no key", async () => {
    /* Love named Ada on the studio doc; the homeserver answers the roster */
    const { defaultStudioDoc } = await import("@/lib/studio/doc");
    await fs.writeFile(
      path.join(process.cwd(), "data", "studio.json"),
      JSON.stringify({ ...defaultStudioDoc(), host: { name: "Love", specialty: "" }, guests: [{ name: "Ada", specialty: "" }] }),
    );
    process.env.MATRIX_BOT_TOKEN = "task-440-bot-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const u = String(url);
        if (u.includes("/directory/room/")) return Response.json({ room_id: "!hf:onecocreation.com" });
        if (u.includes("/joined_members")) {
          return Response.json({ joined: { "@ada:onecocreation.com": { display_name: "Ada" } } });
        }
        if (u.includes("/presence/")) return Response.json({ presence: "online" });
        return Response.json({}, { status: 404 });
      }),
    );
    const { studioRoomKey } = await import("@/lib/live");
    const spy = vi.mocked(studioRoomKey);
    spy.mockClear();
    const html = await renderRoom("heart-field", memberCookie);
    expect(spy).not.toHaveBeenCalled();
    expect(html).not.toContain("password=");
    expect(html).not.toContain(v2Key(ROOM));
    delete process.env.MATRIX_BOT_TOKEN;
  });

  it("the page source: no key derivation, no keyed camera mint, no client key prop", () => {
    const src = read("src/app/rooms/[slug]/page.tsx");
    expect(src).not.toContain("studioRoomKey(");
    expect(src).not.toContain("roomKey=");
    /* the named-camera door mints UNKEYED (three arguments — no key) */
    expect(src).toMatch(/cameraDoor = studioGuestCameraLink\(switches\.meeting\.vdoHost, studioVdo\.room, mine\.slice\(1, mine\.indexOf\(":"\)\)\)/);
  });

  it("Heart Field does not regain the key when live: the stage slot renders with no password= in any frame", async () => {
    const { default: RoomVideoSlot } = await import("@/components/rooms/RoomVideoSlot");
    const { createElement } = await import("react");
    const html = renderToStaticMarkup(
      createElement(RoomVideoSlot, {
        live: true,
        roomTitle: "The Heart Field",
        rail: "vdo",
        vdoHost: "vdo.onecocreation.com",
        studioRoom: ROOM,
        roomKey: undefined,
        cameraDoor: "https://vdo.onecocreation.com/?room=onecocreation_studio&push=ada",
      }),
    );
    expect(html).not.toContain("password=");
    expect(html).not.toContain(v2Key(ROOM));
  });
});

describe("the rotation — v2 retires every harvested v1 key (RED on 5828cd0)", () => {
  it("studioRoomKey differs from the v1 HMAC and stays 12 lowercase hex", async () => {
    const { studioRoomKey } = await import("@/lib/live");
    for (const room of [ROOM, HYPHEN_ROOM, "onecocreation_reading_with_ada", "a297b0000000000000000001"]) {
      const key = studioRoomKey(room);
      expect(key).toMatch(/^[0-9a-f]{12}$/);
      expect(key).not.toBe(v1Key(room));
      expect(key).toBe(v2Key(room));
    }
  });

  it("the ledger line records the retirement (source pin)", () => {
    const src = read("src/lib/live.ts");
    expect(src).toContain("v1 retired: minted anonymously through /meet/studio until T-440");
  });
});

describe("every standing-studio guest door is signed (RED on 5828cd0)", () => {
  it("/a/studio signs its copyable guest door (source pin)", () => {
    const src = read("src/app/a/studio/page.tsx");
    expect(src).toContain("withStudioInvite(meetStudioUrl(origin, vdo.room), vdo.room)");
  });

  it("the emailed invite's door is signed and verifies (route + token, real)", async () => {
    const src = read("src/app/api/admin/studio/invite/route.ts");
    expect(src).toContain("withStudioInvite(");
    const tok = (await import("@/lib/studio/invite-token")) as InviteToken;
    const door = tok.withStudioInvite("https://site.example/meet/studio/onecocreation_studio", ROOM)!;
    expect(door).toMatch(/^https:\/\/site\.example\/meet\/studio\/onecocreation_studio\?invite=\d+\.[a-f0-9]{64}$/);
    const token = door.split("?invite=")[1];
    expect(tok.verifyStudioInvite(ROOM, token)).toBe(true);
    /* a failed mint must not produce a usable unsigned standing-room door */
    const saved = process.env.SEAT_SECRET;
    delete process.env.SEAT_SECRET;
    expect(tok.withStudioInvite("https://site.example/meet/studio/onecocreation_studio", ROOM)).toBeNull();
    process.env.SEAT_SECRET = saved;
  });

  it("the go-live card takes the signed door as a prop — it never signs client-side (source pins)", () => {
    const src = read("src/app/a/live/go-live-room.tsx");
    expect(src).toContain("studioGuestDoor");
    expect(src).not.toContain("meetStudioUrl(");
    expect(src).not.toContain("withStudioInvite(");
    const hub = read("src/components/console/StudioHub.tsx");
    expect(hub).toContain("studioGuestDoor={guestDoor}");
  });
});
