# TASK-448 register

Base: 336313a411727345bc7d39839fd8175841113b39
Code/pins revision: 460867bc024fad7c976751f7d6960416a6e239f8
Builder: Chief O'Brien on Astra

## Named decision

Decision (a): field-bearing .kit-inline-form uses a two-column grid and the field wrapper uses display:contents. Label is above the input; input and button share a stretching track; the field error has its own track directly below its input. Phone layout uses one column and auto-places the button after the input/error, avoiding an empty error track when there is no error. The original flex rule remains for the member form; new button rules require :has(>.kit-field), and the error alignment selector requires the field ancestor. ReadingSignUp.tsx, Field.tsx and Button.tsx remain unchanged, preserving the existing error accessibility wiring. No colours, fonts, style literals or new CSS files introduced. Contrast calculation not run: no colour changes.

## Removal register

ReadingStage.tsx:
- Removed the watching controls row, its kit-stage-tools wrapper, and its Full screen and Leave page buttons. The watching branch now returns null, not an empty controls container.
- Removed onLeave and onFullScreen from ReadingStageBodyProps, the body destructuring, and the caller props.
- Removed leave() and fullScreen(), including the requestFullscreen call and its courtesy catch.
- Removed onLeave as the onEnded fallback. onViewerEnded is now required and wires directly to JitsiViewer.onEnded; the island still passes viewerEnded.
- Replaced the phase-control docblock's redundant tools policy with the Admiral's Jitsi-toolbar-only law.
- Replaced the obsolete frame-ref fullscreen comment. frameRef is retained because the explicitly read-only Stage 2 branch still binds it. That branch is byte-identical to base. Both slim/tools CSS rules remain untouched.

JitsiViewer.tsx:
- Added only useHostPageLocalStorage and disabledNotifications with the exact paired comments from the specified parked commit. The remainder is byte-identical to base; no identity/name work.

kit.css:
- Replaced the inline form field's flex sizing rule with display:contents and the field-bearing grid rules. Other CSS is byte-identical to base.

## Changed assertions and fixtures (old → new)

The unified diff below records every changed assertion with original/final file line anchors. No unrelated assertion was changed; reading-look.test.ts remains unchanged.

- tests/reading-stage.test.ts:50-51 (base) → :50: removed onLeave/onFullScreen fixture callbacks; provided onViewerEnded instead.
- tests/reading-stage.test.ts:139 (base) → :138: requires kit-stage-controls-slim → forbids any kit-stage-controls.
- tests/reading-stage.test.ts:140 (base) → :139: quiet-button count expectation changes with removal of the page tools (exact old/new literals below).
- tests/reading-stage.test.ts:141 (base) → :140: requires Full screen → forbids Full screen.
- tests/reading-stage.test.ts:142 (base) → :141: requires Leave text → forbids a page button whose label is Leave.
- tests/reading-stage.test.ts:312 (base) → :311: requires requestFullscreen → forbids requestFullscreen. New :312-314 pins absence of removed props/functions and both links of the viewerEnded callback wiring.
- Associated phase documentation and watching/test descriptions were updated to match the changed law; the existing primary-button and One tap assertions remain unchanged.
- tests/jitsi-viewer.test.ts:30-34: no prior pin → requires both viewer keys and forbids either key anywhere in the unchanged JitsiRoom source. Uses the requested parked test idiom, without its name work.
- tests/reading-sign-up.test.ts:263-271: no prior pin → retains the member flex rule and pins the field-only grid, display:contents, label/input/error tracks, stretched button and phone stacking. Before CSS implementation, the new error selector was narrowed to .kit-field .kit-field-error so member errors cannot change alignment; phone button row changed from fixed to auto so an absent error does not leave an empty track. Both refinements were rerun red before CSS, then committed at the pins gate.

diff --git a/tests/jitsi-viewer.test.ts b/tests/jitsi-viewer.test.ts
index 2bd82c2..679fdba 100644
--- a/tests/jitsi-viewer.test.ts
+++ b/tests/jitsi-viewer.test.ts
@@ -24,6 +24,17 @@ const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8")
 const VIEWER = "src/components/reading/JitsiViewer.tsx";
 const JITSIROOM = "src/components/booking/JitsiRoom.tsx";
 
+describe("JitsiViewer — viewer-only storage isolation", () => {
+  it("host-page storage and moderator-toast suppression ship together", async () => {
+    const src = await read(VIEWER);
+    expect(src).toContain("useHostPageLocalStorage: true");
+    expect(src).toContain('disabledNotifications: ["notify.moderator"]');
+    const stage2 = await read(JITSIROOM);
+    expect(stage2).not.toContain("useHostPageLocalStorage");
+    expect(stage2).not.toContain("disabledNotifications");
+  });
+});
+
 describe("JitsiViewer — it never asks for the viewer's own media", () => {
   it("no initial getUserMedia, both tracks born muted, no prejoin step", async () => {
     const src = await read(VIEWER);
diff --git a/tests/reading-sign-up.test.ts b/tests/reading-sign-up.test.ts
index 92cdf91..e29cf0d 100644
--- a/tests/reading-sign-up.test.ts
+++ b/tests/reading-sign-up.test.ts
@@ -257,6 +257,21 @@ describe("ReadingSignUp — T-438 public-variant source pins (the machine and th
   });
 });
 
+describe("public sign-up row — decision (a), field-only grid", () => {
+  it("label, shared input/button row, and error have separate tracks; the member form stays flex", async () => {
+    const css = await read("src/app/kit.css");
+    expect(css).toContain(".kit-inline-form{display:flex;gap:10px;align-items:flex-end;justify-content:center;flex-wrap:wrap;width:100%;max-width:520px}");
+    expect(css).toContain(".kit-inline-form:has(>.kit-field){display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;gap:6px 10px}");
+    expect(css).toContain(".kit-inline-form .kit-field{display:contents;text-align:left}");
+    expect(css).toContain(".kit-inline-form .kit-field-label{grid-column:1;grid-row:1}");
+    expect(css).toContain(".kit-inline-form .kit-field-input{grid-column:1;grid-row:2;min-width:0;box-sizing:border-box;width:100%}");
+    expect(css).toContain(".kit-inline-form .kit-field .kit-field-error{grid-column:1;grid-row:3;text-align:left}");
+    expect(css).toContain(".kit-inline-form:has(>.kit-field)>.kit-btn{grid-column:2;grid-row:2;align-self:stretch;display:flex;align-items:center;justify-content:center;box-sizing:border-box}");
+    expect(css).toContain("@media (max-width:640px){.kit-inline-form:has(>.kit-field){grid-template-columns:minmax(0,1fr)}");
+    expect(css).toContain(".kit-inline-form:has(>.kit-field)>.kit-btn{grid-column:1;grid-row:auto;justify-self:center;margin-top:4px}");
+  });
+});
+
 describe("ReadingSignUp — the default, hook-wired export", () => {
   it("state:'off' renders nothing, whatever the session (Ground)", () => {
     const props: { state: NoticeState } = { state: { kind: "off" } };
diff --git a/tests/reading-stage.test.ts b/tests/reading-stage.test.ts
index 8478226..542f3f9 100644
--- a/tests/reading-stage.test.ts
+++ b/tests/reading-stage.test.ts
@@ -16,8 +16,8 @@ import Stage2Details from "@/components/reading/Stage2Details";
  *
  * The phase-control law (Amendment 1's Tests): each phase has exactly ONE
  * primary control — closed has none, published has "Watch Love live",
- * watching has only the two small kit-btn-quiet tools (Full screen and
- * Leave), failed has "Try again", ended has "Watch again" only while the
+ * watching has no page control (Jitsi owns fullscreen and hang-up),
+ * failed has "Try again", ended has "Watch again" only while the
  * room is still published. The book art is in closed, published and
  * ended; there is no <img> of it while watching (JitsiViewer replaces it
  * in the SAME frame).
@@ -47,8 +47,7 @@ function bodyProps(overrides: Partial<ReadingStageBodyProps>): ReadingStageBodyP
     left: false,
     onWatch: () => {},
     onTryAgain: () => {},
-    onLeave: () => {},
-    onFullScreen: () => {},
+    onViewerEnded: () => {},
     onLeaveStage2: () => {},
     onJoinStage2: () => {},
     ...overrides,
@@ -126,7 +125,7 @@ describe("published, not yet watching — one tap starts her picture and sound",
   });
 });
 
-describe("watching — JitsiViewer replaces the book in the same frame; two small tools, not a bar", () => {
+describe("watching — JitsiViewer replaces the book; its toolbar is the only control", () => {
   const html = render(bodyProps({ phase: "published", watching: true, room: ROOM }));
 
   it("the viewer is mounted, the book's <img> is GONE, the LIVE chip stays", () => {
@@ -135,11 +134,11 @@ describe("watching — JitsiViewer replaces the book in the same frame; two smal
     expect(html).toContain("kit-stage-chip");
   });
 
-  it("the controls area is slim and holds ONLY the two kit-btn-quiet tools: Full screen and Leave", () => {
-    expect(html).toContain("kit-stage-controls-slim");
-    expect(count(html, "kit-btn-quiet")).toBe(2);
-    expect(html).toContain("Full screen");
-    expect(html).toContain("Leave");
+  it("no page controls row, Full screen or Leave button under the viewer", () => {
+    expect(html).not.toContain("kit-stage-controls");
+    expect(count(html, "kit-btn-quiet")).toBe(0);
+    expect(html).not.toContain("Full screen");
+    expect(html).not.toMatch(/<button\b[^>]*>\s*Leave\s*<\/button>/);
     expect(count(html, "kit-btn-main")).toBe(0);
     expect(html).not.toContain("One tap");
   });
@@ -307,9 +306,12 @@ describe("the island's own wiring — source pins (the repo runs no jsdom)", ()
     expect(src).not.toContain('from "@/components/reading/Stage2Details"');
   });
 
-  it("the Full screen tool calls requestFullscreen on the frame", async () => {
+  it("Jitsi owns fullscreen and hang-up; the page retains the viewer-ended path only", async () => {
     const src = await read(STAGE);
-    expect(src).toContain("requestFullscreen");
+    expect(src).not.toContain("requestFullscreen");
+    expect(src).not.toMatch(/\bonLeave\b|\bonFullScreen\b|function leave\(|function fullScreen\(/);
+    expect(src).toContain("onEnded={onViewerEnded}");
+    expect(src).toContain("onViewerEnded={viewerEnded}");
   });
 
   it("SSR hands the phase only — no room, no host URL, no moderator data in the props (phase-only SSR)", async () => {
## Verification

Red tests were committed before production changes. Actual gate and probe outputs, including warnings, are pasted in the outbox SUMMARY.md. Focused green, source scope checks, browser row measurement, and supplemental phone/member/error-accessibility checks passed. Independent diff reviewer returned passed=true, no security concerns and no logic errors. Live Jitsi authority and hover-toolbar interaction remain the Admiral's real-browser hand test; local layout checks do not claim that hand test was run.

Before (baseline production source; only lane claim existed):
SLOP row-align http://127.0.0.1:4846/reading dark 1440: field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=42 · Δcentre 4.6 Δheight 9.2
SLOP row-align http://127.0.0.1:4846/reading dark 1440 (failed submit): field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=42 · Δcentre 32.9 Δheight 9.2
SLOP row-align http://127.0.0.1:4846/reading light 1440: field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=42 · Δcentre 4.6 Δheight 9.2
SLOP row-align http://127.0.0.1:4846/reading light 1440 (failed submit): field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=42 · Δcentre 32.9 Δheight 9.2
4 rows measured, 4 outside ±1px
Exit: 1


After (lane production source):
ok   row-align http://127.0.0.1:4846/reading dark 1440: field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=51.2 · Δcentre 0 Δheight 0
ok   row-align http://127.0.0.1:4846/reading dark 1440 (failed submit): field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=51.2 · Δcentre 0 Δheight 0
ok   row-align http://127.0.0.1:4846/reading light 1440: field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=51.2 · Δcentre 0 Δheight 0
ok   row-align http://127.0.0.1:4846/reading light 1440 (failed submit): field "reading-sign-up-email" h=51.2 · button "KEEP ME POSTED" h=51.2 · Δcentre 0 Δheight 0
4 rows measured, 0 outside ±1px
Exit: 0


Scope proof:
Stage 2 branch: byte-identical to base
CSS outside .kit-inline-form region: byte-identical to base
Viewer port: exact keys/comments only; remainder byte-identical to base
Read-only files, member form, and root claim: unchanged
Changed paths: all within OWNS
Current revision: 460867bc024fad7c976751f7d6960416a6e239f8
Changed assertion source lines:
tests/reading-stage.test.ts:48:     onWatch: () => {},
tests/reading-stage.test.ts:49:     onTryAgain: () => {},
tests/reading-stage.test.ts:50:     onViewerEnded: () => {},
tests/reading-stage.test.ts:51:     onLeaveStage2: () => {},
tests/reading-stage.test.ts:52:     onJoinStage2: () => {},
tests/reading-stage.test.ts:53:     ...overrides,
tests/reading-stage.test.ts:137:   it("no page controls row, Full screen or Leave button under the viewer", () => {
tests/reading-stage.test.ts:138:     expect(html).not.toContain("kit-stage-controls");
tests/reading-stage.test.ts:139:     expect(count(html, "kit-btn-quiet")).toBe(0);
tests/reading-stage.test.ts:140:     expect(html).not.toContain("Full screen");
tests/reading-stage.test.ts:141:     expect(html).not.toMatch(/<button\b[^>]*>\s*Leave\s*<\/button>/);
tests/reading-stage.test.ts:142:     expect(count(html, "kit-btn-main")).toBe(0);
tests/reading-stage.test.ts:143:     expect(html).not.toContain("One tap");
tests/reading-stage.test.ts:144:   });
tests/reading-stage.test.ts:309:   it("Jitsi owns fullscreen and hang-up; the page retains the viewer-ended path only", async () => {
tests/reading-stage.test.ts:310:     const src = await read(STAGE);
tests/reading-stage.test.ts:311:     expect(src).not.toContain("requestFullscreen");
tests/reading-stage.test.ts:312:     expect(src).not.toMatch(/\bonLeave\b|\bonFullScreen\b|function leave\(|function fullScreen\(/);
tests/reading-stage.test.ts:313:     expect(src).toContain("onEnded={onViewerEnded}");
tests/reading-stage.test.ts:314:     expect(src).toContain("onViewerEnded={viewerEnded}");
tests/reading-stage.test.ts:315:   });
tests/jitsi-viewer.test.ts:27: describe("JitsiViewer — viewer-only storage isolation", () => {
tests/jitsi-viewer.test.ts:28:   it("host-page storage and moderator-toast suppression ship together", async () => {
tests/jitsi-viewer.test.ts:29:     const src = await read(VIEWER);
tests/jitsi-viewer.test.ts:30:     expect(src).toContain("useHostPageLocalStorage: true");
tests/jitsi-viewer.test.ts:31:     expect(src).toContain('disabledNotifications: ["notify.moderator"]');
tests/jitsi-viewer.test.ts:32:     const stage2 = await read(JITSIROOM);
tests/jitsi-viewer.test.ts:33:     expect(stage2).not.toContain("useHostPageLocalStorage");
tests/jitsi-viewer.test.ts:34:     expect(stage2).not.toContain("disabledNotifications");
tests/jitsi-viewer.test.ts:35:   });
tests/jitsi-viewer.test.ts:36: });
tests/reading-sign-up.test.ts:260: describe("public sign-up row — decision (a), field-only grid", () => {
tests/reading-sign-up.test.ts:261:   it("label, shared input/button row, and error have separate tracks; the member form stays flex", async () => {
tests/reading-sign-up.test.ts:262:     const css = await read("src/app/kit.css");
tests/reading-sign-up.test.ts:263:     expect(css).toContain(".kit-inline-form{display:flex;gap:10px;align-items:flex-end;justify-content:center;flex-wrap:wrap;width:100%;max-width:520px}");
tests/reading-sign-up.test.ts:264:     expect(css).toContain(".kit-inline-form:has(>.kit-field){display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;gap:6px 10px}");
tests/reading-sign-up.test.ts:265:     expect(css).toContain(".kit-inline-form .kit-field{display:contents;text-align:left}");
tests/reading-sign-up.test.ts:266:     expect(css).toContain(".kit-inline-form .kit-field-label{grid-column:1;grid-row:1}");
tests/reading-sign-up.test.ts:267:     expect(css).toContain(".kit-inline-form .kit-field-input{grid-column:1;grid-row:2;min-width:0;box-sizing:border-box;width:100%}");
tests/reading-sign-up.test.ts:268:     expect(css).toContain(".kit-inline-form .kit-field .kit-field-error{grid-column:1;grid-row:3;text-align:left}");
tests/reading-sign-up.test.ts:269:     expect(css).toContain(".kit-inline-form:has(>.kit-field)>.kit-btn{grid-column:2;grid-row:2;align-self:stretch;display:flex;align-items:center;justify-content:center;box-sizing:border-box}");
tests/reading-sign-up.test.ts:270:     expect(css).toContain("@media (max-width:640px){.kit-inline-form:has(>.kit-field){grid-template-columns:minmax(0,1fr)}");
tests/reading-sign-up.test.ts:271:     expect(css).toContain(".kit-inline-form:has(>.kit-field)>.kit-btn{grid-column:1;grid-row:auto;justify-self:center;margin-top:4px}");
tests/reading-sign-up.test.ts:272:   });
tests/reading-sign-up.test.ts:273: });


## Seams

None required. No out-of-scope change made. Number One still owns acceptance, the visual walk, push and PR; the Admiral owns the remembered-host-login hand test.
