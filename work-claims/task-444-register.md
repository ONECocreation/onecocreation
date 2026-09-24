# TASK-444 — reading doors register

Status: BLOCKED at full Vitest gate; owned implementation and focused pins are green. This is a builder hand-back, not acceptance.

Base: 8ca76077f95340e41f3bb5d9aa1b8141179190bf
Worktree: /home/pac/dev/worktrees/task-444
Branch: feat/task-444-reading-doors
Claim block: 968337.

Changes

Added READING_PAGE_PATH without changing the existing reading-room module contents. Home card always opens /reading with Go to the reading. Default Community and member menus carry Read with Love → /reading. Heart Field's catalog label now names the room, while the Memberships door is unchanged. Letters insert and the default welcome-letter URL use the public reading page; operator overrides keep the existing path and escaping.

Root WORK-CLAIM.md was explicitly required by the user, in addition to this brief's work-claims file. Necessary constant import changes accompany the owned call sites. No saved-menu migration, CSS/style changes, environment-file reads, fetch, push, merge, or git configuration. Historical comments and test titles outside the narrowly owned assertions remain as found; rail-dependent welcome-letter copy was not in scope.

Changed pins

Generated from base-versus-working-file line comparisons. Every assertion change and its supporting import/selector change is listed. OLD/NEW line numbers refer to base/current respectively. No line shifts in these existing tests.

CHANGED_ASSERTIONS_AND_SUPPORTING_LINES=19
tests/door-machine.test.ts:123 -> tests/door-machine.test.ts:123
  OLD: expect(MEMBER_MENU.map((i) => i.label)).toEqual(["Welcome", "My library", "Calendar", "The reading room"]);
  NEW: expect(MEMBER_MENU.map((i) => i.label)).toEqual(["Welcome", "My library", "Calendar", "Read with Love"]);

tests/nav-config.test.ts:96 -> tests/nav-config.test.ts:96
  OLD: expect.arrayContaining(["News & letters", "Free meditation", "11:11 Live with Love", "The reading room"]),
  NEW: expect.arrayContaining(["News & letters", "Free meditation", "11:11 Live with Love", "Read with Love"]),

tests/nav-config.test.ts:113 -> tests/nav-config.test.ts:113
  OLD: expect(community?.subs?.map((s) => s.label)).toContain("The reading room");
  NEW: expect(community?.subs?.map((s) => s.label)).toContain("Read with Love");

tests/read-with-love-letter.test.ts:102 -> tests/read-with-love-letter.test.ts:102
  OLD: expect(sent[0].html).toContain('href="https://meet.onecocreation.com/read-with-love"');
  NEW: expect(sent[0].html).toContain(`href="${(await import("@/lib/subscribers")).siteBase()}/reading"`);

tests/read-with-love-letter.test.ts:114 -> tests/read-with-love-letter.test.ts:114
  OLD: expect(sent[0].html).toContain('href="https://site.example.invalid/rooms/heart-field"');
  NEW: expect(sent[0].html).toContain('href="https://site.example.invalid/reading"');

tests/read-with-love-letter.test.ts:128 -> tests/read-with-love-letter.test.ts:128
  OLD: const { READING_ROOM_PATH } = await import("@/lib/reading-room");
  NEW: const { READING_PAGE_PATH, READING_ROOM_PATH } = await import("@/lib/reading-room");

tests/read-with-love-letter.test.ts:133 -> tests/read-with-love-letter.test.ts:133
  OLD: expect(sent[0].html).toContain(`href="${siteBase()}${READING_ROOM_PATH}"`);
  NEW: expect(sent[0].html).toContain(`href="${siteBase()}${READING_PAGE_PATH}"`);

tests/read-with-love-letter.test.ts:140 -> tests/read-with-love-letter.test.ts:140
  OLD: expect(sent[0].html).toContain("The room link is coming");
  NEW: expect(sent[0].html).toContain(`href="${(await import("@/lib/subscribers")).siteBase()}/reading"`);

tests/read-with-love-letter.test.ts:141 -> tests/read-with-love-letter.test.ts:141
  OLD: expect(sent[0].html).toContain("before the first reading.");
  NEW: expect(sent[0].html).not.toContain("The room link is coming");

tests/reading-door.test.ts:31 -> tests/reading-door.test.ts:31
  OLD: expect(src).toContain('import { READING_ROOM_PATH } from "@/lib/reading-room"');
  NEW: expect(src).toContain('import { READING_PAGE_PATH, READING_ROOM_PATH } from "@/lib/reading-room"');

tests/reading-door.test.ts:36 -> tests/reading-door.test.ts:36
  OLD: expect(src.slice(menuIdx)).toContain('label: "The reading room", href: READING_ROOM_PATH');
  NEW: expect(src.slice(menuIdx)).toContain('label: "Read with Love", href: READING_PAGE_PATH');

tests/reading-door.test.ts:46 -> tests/reading-door.test.ts:46
  OLD: expect(community?.subs?.map((s) => s.label)).toContain("The reading room");
  NEW: expect(community?.subs?.map((s) => s.label)).toContain("Read with Love");

tests/reading-door.test.ts:48 -> tests/reading-door.test.ts:48
  OLD: expect(community?.subs?.find((s) => s.label === "The reading room")?.href).toBe("/rooms/heart-field");
  NEW: expect(community?.subs?.find((s) => s.label === "Read with Love")?.href).toBe("/reading");

tests/reading-door.test.ts:53 -> tests/reading-door.test.ts:53
  OLD: expect(community2?.subs?.map((s) => s.label)).toContain("The reading room");
  NEW: expect(community2?.subs?.map((s) => s.label)).toContain("Read with Love");

tests/reading-door.test.ts:61 -> tests/reading-door.test.ts:61
  OLD: expect(entry?.label).toBe("The reading room");
  NEW: expect(entry?.label).toBe("Heart Field");

tests/site-knows-who-is-signed-in.test.ts:112 -> tests/site-knows-who-is-signed-in.test.ts:112
  OLD: const { READING_ROOM_PATH } = await import("@/lib/reading-room");
  NEW: const { READING_PAGE_PATH } = await import("@/lib/reading-room");

tests/site-knows-who-is-signed-in.test.ts:113 -> tests/site-knows-who-is-signed-in.test.ts:113
  OLD: const row = MEMBER_MENU.find((i) => i.label === "The reading room")!;
  NEW: const row = MEMBER_MENU.find((i) => i.label === "Read with Love")!;

tests/site-knows-who-is-signed-in.test.ts:115 -> tests/site-knows-who-is-signed-in.test.ts:115
  OLD: expect(row.href).toBe(READING_ROOM_PATH);
  NEW: expect(row.href).toBe(READING_PAGE_PATH);

tests/site-knows-who-is-signed-in.test.ts:116 -> tests/site-knows-who-is-signed-in.test.ts:116
  OLD: expect(row.href).toBe("/rooms/heart-field");
  NEW: expect(row.href).toBe("/reading");

GATE_SUMMARY_FROM_LOGS
red.log
 Test Files  1 failed (1)
      Tests  10 failed | 4 passed (14)
EXIT_CODE=1
green-new.log
 Test Files  1 passed (1)
      Tests  14 passed (14)
EXIT_CODE=0
pins-before.log
 Test Files  5 failed | 4 passed (9)
      Tests  11 failed | 135 passed (146)
EXIT_CODE=1
green-focused.log
 Test Files  10 passed (10)
      Tests  160 passed (160)
EXIT_CODE=0
gate-vitest.log
 Test Files  2 failed | 212 passed (214)
      Tests  5 failed | 2575 passed (2580)
EXIT_CODE=1
gate-scripts.log
70 passed, 0 failed
179 passed, 0 failed
14 passed, 0 failed
45 passed, 0 failed
58 passed, 0 failed
EXIT_CODE=0
gate-eslint.log
EXIT_CODE=0
gate-tsc.log
EXIT_CODE=0
gate-build.log
✓ Compiled successfully in 6.0s
EXIT_CODE=0
seam-reading-letters.log
 Test Files  1 failed (1)
      Tests  3 failed | 37 passed (40)
EXIT_CODE=1
Preserved pins

The saved-menu round-trip fixture and KNOWN_NAV_HREFS room assertion remain byte-identical. free-reading-path, letter-site-links, room-vantage-arrival, and hero-door-to-reading were run unchanged. New tests also render the home card with signed-out and signed-in fixtures, cover the static rail, and preserve overrides on every tested rail.

Review

Independent read-only implementation review: passed; no security concerns or logic errors. Independent read-only pin review: passed; no security concerns or logic errors. Added-source-line security scan: PASS. Optional reviewer suggestions were additional catalog/absent-room coverage; the existing catalog pin covers the relabel, and no additional scope was taken.

Seams

Full Vitest is blocked by tests outside OWNS. Do not accept or merge this lane as fully green.

tests/site-config.test.ts still pins the default Community label to The reading room. The following exact minimal assertion diff is required, but was NOT applied.

tests/reading-letters.test.ts is explicitly READ-ONLY. Its day-of gate tests pass a historical TICK_15Z into the outer gate but leave Date.now() live; the production sendReadingDayOf rechecks Date.now() and skips past occurrences. The isolated test run reproduces the failure. Command output: REAL_CLOCK_AT_OR_AFTER_FIXTURE_START=true. The following describe-local fake-clock diff is proposed for its owner; it was NOT applied or verified. The existing afterEach already restores real timers. Source and test, reading-schedule and booking-time match the base. A separate base-checkout execution was not run.

--- a/tests/site-config.test.ts
+++ b/tests/site-config.test.ts
@@ -152,7 +152,7 @@
     expect(community?.subs?.map((s) => s.label)).not.toContain("Classes & rooms");
     expect(community?.subs?.map((s) => s.label)).not.toContain("Classes");
     // the reading room rides regardless of the classes switch — its own door
-    expect(community?.subs?.map((s) => s.label)).toContain("The reading room");
+    expect(community?.subs?.map((s) => s.label)).toContain("Read with Love");
     // Support carries only itself — the old stand-ins are gone for good
     expect(menu.find((m) => m.label === "Support")?.subs).toBeUndefined();
   });
@@ -167,7 +167,7 @@
     const community = menu.find((m) => m.label === "Community");
     expect(community?.subs?.map((s) => s.label)).toContain("Free meditation");
     expect(community?.subs?.map((s) => s.label)).toContain("Classes");
-    expect(community?.subs?.map((s) => s.label)).toContain("The reading room");
+    expect(community?.subs?.map((s) => s.label)).toContain("Read with Love");
     expect(menu.find((m) => m.label === "Support")?.subs).toBeUndefined();
   });
 });

--- a/tests/reading-letters.test.ts
+++ b/tests/reading-letters.test.ts
@@ -332,6 +332,11 @@
 /* ═══════════════════════ the tick's added call ═══════════════════════ */

 describe("enqueueReadingDayOf — the day-of gate (R5, decision A's tick, the pure function of schedule/nowMs/once-marker)", () => {
+  beforeEach(() => {
+    vi.useFakeTimers();
+    vi.setSystemTime(TICK_15Z);
+  });
+
   it("fires at a 15:00-UTC-shaped tick on the occurrence's zone-day, with capacity, for every reading-tagged subscriber", async () => {
     subscribedState.add("a@example.com");
     subscribedState.add("b@example.com");
Integration and remaining acceptance

Number One must resolve/authorize these seams, merge main with TASK-438 into this branch as the brief requires, rerun all gates, and perform the browser preview/hand test. Builder did not fetch, push, merge, or launch a preview. The reminder-letter door remains TASK-438's responsibility; it was not changed here. Love's saved menu remains untouched; the Admiral re-points it manually if needed.

Full gate output, red/green evidence, final SHA, and clean-tree proof are in /home/pac/dev/hermes/outbox/task-444-gpt-6-astra/SUMMARY.md. Raw execution logs are under this worktree's ignored node_modules/.cache/task-444-proof/ directory.
