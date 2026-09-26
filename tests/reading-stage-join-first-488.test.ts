import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingStageBody, type ReadingStageBodyProps } from "@/components/reading/ReadingStage";
import { ReadingStageDoorBody, type ReadingStageDoorBodyProps, type Wire } from "@/components/reading/ReadingStageDoor";

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

/**
 * TASK-488 (block 968,624, the Admiral's live Q&A test on production): a
 * /reading guest lands on Jitsi's own prejoin screen ("Join meeting"). The
 * book picture sat OVER that screen, hiding its Join button, so a guest
 * never joined and never heard Love's music. The picture now waits until
 * THIS viewer has joined (JitsiRoom's `onJoined`, from
 * videoConferenceJoined). The prejoin screen shows no host video, so
 * leaving it uncovered leaks nothing.
 */

const ROOM = "oc-0123456789abcdef";
const DOMAIN = "meet.reading-join-first-fixture.invalid";
const COVER = 'class="kit-stage-cover"';

function stageProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyProps {
  return {
    phase: "published",
    signedIn: true,
    room: ROOM,
    playgroundLock: { locked: false, floorName: "Test Tier" },
    jitsiDomain: DOMAIN,
    nextWords: null,
    countdown: null,
    countdownWhen: null,
    left: false,
    ended: false,
    onRoomEnded: () => {},
    onRejoin: () => {},
    partLabel: "1:11 PM MDT · The Reading",
    ...overrides,
  };
}

function doorProps(overrides: Partial<ReadingStageDoorBodyProps>): ReadingStageDoorBodyProps {
  return {
    wire: { decision: "open", reachable: true, room: ROOM, camera: "hidden" } as Wire,
    jitsiDomain: DOMAIN,
    whenWords: null,
    label: "the Q&A",
    partLabel: "3:33 PM MDT · The Q&A with Love",
    notOwned: createElement("p", null, "NOT-OWNED-FIXTURE"),
    left: false,
    onEnded: () => {},
    onRejoin: () => {},
    ...overrides,
  };
}

const stage = (p: ReadingStageBodyProps) => renderToStaticMarkup(createElement(ReadingStageBody, p));
const door = (p: ReadingStageDoorBodyProps) => renderToStaticMarkup(createElement(ReadingStageDoorBody, p));

describe("TASK-488: the picture never hides Jitsi's Join button", () => {
  it("Parts 1/2: not joined yet, camera hidden: no cover, no waiting words", () => {
    const html = stage(stageProps({ cameraShown: false, joined: false }));
    expect(html).not.toContain(COVER);
    expect(html).not.toContain("Love is here.");
  });

  it("Parts 1/2: joined, camera hidden: the cover is up", () => {
    const html = stage(stageProps({ cameraShown: false, joined: true }));
    expect(html).toContain(COVER);
    expect(html).toContain("Love is here.");
  });

  it("Parts 1/2: joined, camera shown: no cover", () => {
    expect(stage(stageProps({ cameraShown: true, joined: true }))).not.toContain(COVER);
  });

  it("Parts 3/4: not joined yet, camera hidden: no cover", () => {
    const html = door(doorProps({ cameraShown: false, joined: false }));
    expect(html).not.toContain(COVER);
    expect(html).not.toContain("Love is here.");
  });

  it("Parts 3/4: joined, camera hidden: the cover is up", () => {
    const html = door(doorProps({ cameraShown: false, joined: true }));
    expect(html).toContain(COVER);
    expect(html).toContain("Love is here.");
  });

  it("the two stage islands start not-joined and pass JitsiRoom's signal through", async () => {
    for (const rel of ["src/components/reading/ReadingStage.tsx", "src/components/reading/ReadingStageDoor.tsx"]) {
      const src = await read(rel);
      expect(src).toContain("const [joined, setJoined] = useState(false);");
      expect(src).toContain("onJoined={setJoined}");
      expect(src).toContain("onJoined={onJoined}");
      expect(src).toContain("joined && !cameraShown");
    }
  });

  it("a server-side end clears the join (no stale true into the next room)", async () => {
    expect(await read("src/components/reading/ReadingStage.tsx")).toMatch(/setCameraShown\(false\);[\s\S]{0,300}setJoined\(false\);[\s\S]{0,200}readingShownNext/);
    expect(await read("src/components/reading/ReadingStageDoor.tsx")).toContain('if (decision !== "open") setJoined(false);');
  });

  it("JitsiRoom resets on boot, flips on videoConferenceJoined, and clears on both farewells", async () => {
    const src = await read("src/components/booking/JitsiRoom.tsx");
    expect(src).toContain("onJoined?.(false);");
    expect(src).toContain('a.addListener("videoConferenceJoined", () => { if (live) onJoined(true); });');
    expect(src).toMatch(/"readyToClose", \(\) => \{ if \(live\) \{ setState\("ended"\); onJoined\?\.\(false\);/);
    expect(src).toMatch(/"videoConferenceLeft", \(\) => \{ if \(live\) \{ setState\("ended"\); onJoined\?\.\(false\);/);
  });
});
