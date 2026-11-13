import { describe, expect, it } from "vitest";
import { tipStampFor } from "@/lib/chain-tip-stamp";

/* The tip's time stamp must belong to the block at that height: a block list
   that lags the height gives null, never the previous block's stamp (that
   pinned the clocks' minute hand and showed the ₿ on the 7th lap). */
describe("tipStampFor", () => {
  const list = [{ height: 975665, timestamp: 1794481009 }, { height: 975664, timestamp: 1794480600 }];
  it("gives the stamp of the block at the height", () => expect(tipStampFor(list, 975664)).toBe(1794480600));
  it("gives null when the list lags the height", () => expect(tipStampFor(list, 975666)).toBeNull());
  it("gives null for junk", () => {
    expect(tipStampFor(null, 975666)).toBeNull();
    expect(tipStampFor([{ height: 975666, timestamp: "x" }], 975666)).toBeNull();
    expect(tipStampFor(list, null)).toBeNull();
  });
});
