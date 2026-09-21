import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * TASK-356 (REVIEW-K87 item 2, "SECOND CAUSE — late add-ons never
 * detected"). `src/lib/use-nostr-extension.ts` replaces the old one-shot
 * `useSyncExternalStore(noopSubscribe, …)` pattern with a REAL subscribe:
 * re-check on window `load` and on a ~250ms poll for the first ~5s after
 * a subscriber arrives, notify only on change, clean up on unsubscribe.
 *
 * Environment is `node` (this repo's vitest config has no jsdom), so this
 * drives the exported store functions directly — `subscribeHasNostrExtension`
 * and `readHasNostrExtension` — with a stubbed `global.window` and fake
 * timers, never a rendered hook (the same convention `Tabs.tsx`'s
 * `nextTabIndex` and `door-machine.ts`'s `reduce` are pinned by).
 */

type FakeWindow = { nostr?: unknown; addEventListener: typeof window.addEventListener; removeEventListener: typeof window.removeEventListener };

function makeFakeWindow(): FakeWindow {
  return {
    nostr: undefined,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as FakeWindow;
}

describe("use-nostr-extension — the real subscribe", () => {
  const hadWindow = "window" in globalThis;
  const originalWindow = hadWindow ? (globalThis as { window?: unknown }).window : undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as { window?: unknown }).window = makeFakeWindow();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (hadWindow) (globalThis as { window?: unknown }).window = originalWindow;
    else delete (globalThis as { window?: unknown }).window;
  });

  it("subscribe is not a no-op: it registers a window load listener and starts a poll timer", async () => {
    const { subscribeHasNostrExtension } = await import("@/lib/use-nostr-extension");
    const unsubscribe = subscribeHasNostrExtension(() => {});
    expect((window.addEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("load", expect.any(Function));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unsubscribe();
  });

  it("window.nostr appearing after subscribe flips the snapshot and notifies the listener", async () => {
    const { subscribeHasNostrExtension, readHasNostrExtension } = await import("@/lib/use-nostr-extension");
    expect(readHasNostrExtension()).toBe(false);

    const listener = vi.fn();
    const unsubscribe = subscribeHasNostrExtension(listener);
    expect(listener).not.toHaveBeenCalled();

    /* the nos2x-class add-on injects late, after hydration */
    (window as unknown as { nostr: unknown }).nostr = {};
    await vi.advanceTimersByTimeAsync(250);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(readHasNostrExtension()).toBe(true);
    unsubscribe();
  });

  it("does not notify again once the value stops changing", async () => {
    const { subscribeHasNostrExtension } = await import("@/lib/use-nostr-extension");
    const listener = vi.fn();
    const unsubscribe = subscribeHasNostrExtension(listener);

    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250);
    expect(listener).not.toHaveBeenCalled(); /* still false the whole time */

    unsubscribe();
  });

  it("the window `load` listener re-checks too — not just the poll", async () => {
    const { subscribeHasNostrExtension } = await import("@/lib/use-nostr-extension");
    const listener = vi.fn();
    const unsubscribe = subscribeHasNostrExtension(listener);

    const [, loadHandler] = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[0] === "load",
    )!;
    (window as unknown as { nostr: unknown }).nostr = {};
    (loadHandler as () => void)();

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("timers (and the load listener) are cleaned up on unsubscribe — no notification after leaving", async () => {
    const { subscribeHasNostrExtension } = await import("@/lib/use-nostr-extension");
    const listener = vi.fn();
    const unsubscribe = subscribeHasNostrExtension(listener);

    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    expect(window.removeEventListener as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("load", expect.any(Function));

    (window as unknown as { nostr: unknown }).nostr = {};
    await vi.advanceTimersByTimeAsync(10_000);
    expect(listener).not.toHaveBeenCalled();
  });
});
