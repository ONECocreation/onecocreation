import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import path from "path";
import { JARS } from "@/components/TipJar";

/**
 * TASK-223 (0018.06.23 a₿) — Love's call #7: the Square receipt had "no
 * product description, unreadable order number". This pinned
 * src/app/api/tip/route.ts's createCharge call passing the jar's own
 * existing label word (the same words TipJar.tsx's JARS table and /a's
 * JAR_LABELS already show — grepped, not reinvented) as description, and
 * the tip's own minted tipId as referenceId.
 *
 * TASK-411 (block 968,170 a₿) — the route this file pinned is RETIRED:
 * gifts ride the normal basket as pay-what-you-can offer lines on three
 * zero-priced digital shelf items, and the receipt names the gift by the
 * line's title (checkout's basketDescription joins lineItems[].title —
 * the jar item's title IS the gift's name on the receipt). This file is
 * amended, not deleted (a lane deletes only what its brief sanctions), to
 * keep T-223's intent green in the new world: the retirement is real, and
 * the three jar words still name what was bought. The invoice-rail
 * fixture that used to stand here went with its ground.
 */

describe("the receipt still names the jar (T-223's intent, after TASK-411 retired /api/tip)", () => {
  it("src/app/api/tip/route.ts is gone — the retirement is real, not a redirect", () => {
    expect(existsSync(path.join(process.cwd(), "src", "app", "api", "tip", "route.ts"))).toBe(false);
  });

  it.each([
    ["love", "Tip Love"],
    ["onecocreation", "Tip One Cocreation"],
    ["payforward", "Gifts of Gratitude"],
  ])("jar %s still carries the receipt word %j — now the shelf item's title", (jar, label) => {
    expect(JARS.find((j) => j.key === jar)?.title).toBe(label);
  });
});
