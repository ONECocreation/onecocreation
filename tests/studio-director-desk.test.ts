import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { isolateCwd } from "./helpers/isolate-cwd";

/**
 * TASK-306 (0018.06.25 a₿ · block ~967,218) — THE DIRECTOR'S DESK LIVES
 * IN THE SITE. `/a/studio/room/<room>` mounts the keyed studio DIRECTOR
 * view in the console, operator-gated (T-292 DESIGN.md §2 Page A, the
 * shell + keyed iframe slice). After this lane the keyed studio URL
 * leaves every href and copy button it rode bare: the key appears only
 * inside the iframe src the desk route's own server mints — the T-297
 * posture, now for the director's own seat.
 *
 * Pins:
 *  · the director-shaped mint: `?director=<room>` + key when SEAT_SECRET
 *    is set / none when unset (derive-or-dash), `&hangupbutton`,
 *    `&iframetarget=<origin>`, no guest toggles ever;
 *  · the route: independent operator gate (OperatorGate without the
 *    cookie — a nested route inherits nothing), 404 on an unknown room
 *    (T-297's ONE access read, reused), keyed src with the key appearing
 *    ONLY inside the iframe src (the T-297 render-pin idiom);
 *  · the three call-sites render the in-site path, never a studio-host
 *    director URL (source pins per site, the T-297 idiom);
 *  · the end card: the console's farewell, wired through VdoRoom's new
 *    endCard prop (the guest's card untouched as the default);
 *  · the path builders: directorDeskPath / directorDeskUrl.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const iso = isolateCwd("task-306-director-desk-");
afterAll(() => iso.cleanup());

/* the page reads next/headers (cookie + request origin); the cookie is
 *  per-test mutable, everything else reads as a plain localhost request */
let testCookie: string | null = null;
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "cookie" ? testCookie : null) }),
}));

const SAVED_SECRET = process.env.SEAT_SECRET;
afterAll(() => {
  if (SAVED_SECRET === undefined) delete process.env.SEAT_SECRET;
  else process.env.SEAT_SECRET = SAVED_SECRET;
});

let operatorCookie: string;
let mint: typeof import("@/app/a/studio/room/mint");
let links: typeof import("@/lib/live-links");

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.SEAT_SECRET = "task-306-test-seat-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  operatorCookie = `fe-operator=${makeOperatorToken(pk)}`;
  mint = await import("@/app/a/studio/room/mint");
  links = await import("@/lib/live-links");
});

afterEach(() => {
  vi.unstubAllGlobals();
  testCookie = null;
});

const stubRoomsJsonSilent = () =>
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => null })));

const renderPage = async (room: string) => {
  const { default: DirectorDeskPage } = await import("@/app/a/studio/room/[room]/page");
  return DirectorDeskPage({ params: Promise.resolve({ room }) });
};

describe("the path builders (live-links.ts, additive)", () => {
  it("directorDeskPath / directorDeskUrl — the ONE join point for the in-site desk", () => {
    expect(links.directorDeskPath("onecocreation_studio")).toBe("/a/studio/room/onecocreation_studio");
    expect(links.directorDeskUrl("https://onecocreation.test", "onecocreation_studio")).toBe(
      "https://onecocreation.test/a/studio/room/onecocreation_studio",
    );
  });
});

describe("mintStudioDirectorTarget — the director-shaped mint", () => {
  const base = { vdoHost: "vdo.onecocreation.com", room: "onecocreation_studio", origin: "https://onecocreation.test" };

  it("director-shaped, keyed, hangup + iframetarget, no guest toggles", () => {
    const url = mint.mintStudioDirectorTarget({ ...base, key: "keyabc123x00" });
    expect(url).toContain("?director=onecocreation_studio&label=Love&muteallguests");
    expect(url).toContain("&password=keyabc123x00");
    expect(url).toContain("&hangupbutton");
    expect(url).toContain(`&iframetarget=${encodeURIComponent("https://onecocreation.test")}`);
    expect(url).not.toContain("&mute&"); // the guest's muted arrival is not the seat's
    expect(url).not.toContain("&videomute");
    expect(url).not.toContain("&webcam");
  });

  it("no key → none appended, never a fabricated one (derive-or-dash)", () => {
    const url = mint.mintStudioDirectorTarget({ ...base, key: undefined });
    expect(url).not.toContain("&password=");
    expect(url).toContain("?director=onecocreation_studio");
  });
});

describe("the route — independent gate, capability, keyed src", () => {
  it("no operator cookie → the OperatorGate, never the room (a nested route inherits nothing)", async () => {
    stubRoomsJsonSilent();
    testCookie = null;
    const html = renderToStaticMarkup(await renderPage("onecocreation_studio"));
    expect(html).toContain("This area is for site operators");
    expect(html).not.toContain("<iframe");
  });

  it("an unknown room 404s even FOR the operator — the room id is the capability", async () => {
    stubRoomsJsonSilent();
    testCookie = operatorCookie;
    await expect(renderPage("somebody_else")).rejects.toThrow();
  });

  it("operator + known room: the iframe src is the keyed director mint, key when SEAT_SECRET is set", async () => {
    stubRoomsJsonSilent();
    testCookie = operatorCookie;
    process.env.SEAT_SECRET = "task-306-test-seat-secret";
    const html = renderToStaticMarkup(await renderPage("onecocreation_studio"));
    const srcVal = (html.match(/<iframe[^>]*src="([^"]+)"/) ?? [])[1]?.replace(/&amp;/g, "&") ?? "";
    expect(srcVal).toContain("https://vdo.onecocreation.com/?director=onecocreation_studio");
    expect(srcVal).toContain("&label=Love&muteallguests");
    expect(srcVal).toMatch(/&password=[0-9a-f]{12}&/);
    expect(srcVal).toContain("&hangupbutton");
    expect(srcVal).toContain("&iframetarget=");
  });

  it("the key appears in the iframe src and NOWHERE else in the document (the T-297 posture)", async () => {
    stubRoomsJsonSilent();
    testCookie = operatorCookie;
    process.env.SEAT_SECRET = "task-306-test-seat-secret";
    const { studioRoomKey } = await import("@/lib/live");
    const key = studioRoomKey("onecocreation_studio")!;
    const html = renderToStaticMarkup(await renderPage("onecocreation_studio"));
    const rawSrc = (html.match(/<iframe[^>]*src="([^"]+)"/) ?? [])[1] ?? "";
    expect(rawSrc).toContain(key); // the one legitimate place
    expect(html.replaceAll(rawSrc, "")).not.toContain(key); // and no other
  });

  it("no SEAT_SECRET → the src mints unkeyed, honestly (derive-or-dash — pinned at the mint level: the page's gate itself needs the secret to verify the operator cookie, so an unkeyed page render is not reachable in isolation)", () => {
    const url = mint.mintStudioDirectorTarget({
      vdoHost: "vdo.onecocreation.com",
      room: "onecocreation_studio",
      key: undefined,
      origin: "https://onecocreation.test",
    });
    expect(url).not.toContain("&password=");
  });

  it("source pins: the gate + the capability read + force-dynamic + the ONE mint", () => {
    const src = read("src/app/a/studio/room/[room]/page.tsx");
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain("<OperatorGate configured={operatorsConfigured()} />");
    expect(src).toContain('export const dynamic = "force-dynamic"');
    expect(src).toContain("resolveStudioRoom(room)");
    expect(src).toContain("if (!access) notFound()");
    expect(src).toContain("mintStudioDirectorTarget");
    expect(src).not.toContain("studioGuestLink");
  });
});

describe("the end card — the console's farewell through VdoRoom's endCard prop", () => {
  it("DirectorDeskEndCard: the house's line verbatim, doors back to the console", async () => {
    const { default: DirectorDeskEndCard } = await import("@/app/a/studio/room/[room]/end-card");
    const html = renderToStaticMarkup(h(DirectorDeskEndCard));
    expect(html).toContain("The field holds what you brought 🕊️");
    expect(html).toContain('href="/a/studio"');
    expect(html).toContain('href="/a/live"');
    expect(html).not.toContain('href="/me"'); // the guest's member doors are not hers
  });

  it("VdoRoom honours the endCard override and keeps VdoRoomEndCard as the default", () => {
    const src = read("src/components/booking/VdoRoom.tsx");
    expect(src).toContain("endCard?: React.ReactNode");
    expect(src).toContain("endCard ?? <VdoRoomEndCard />");
  });

  it("the desk page passes the console card", () => {
    const src = read("src/app/a/studio/room/[room]/page.tsx");
    expect(src).toContain("endCard={<DirectorDeskEndCard />}");
  });
});
