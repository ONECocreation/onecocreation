import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * TASK-278 (0018.06.25 a₿ · block 967,125) — pins the grep-zero fact for the
 * renamed `Fren*` component/hook identifiers, scoped to the files this lane
 * owns (the four renamed components, the renamed hook, the two `/u/[handle]`
 * route files, the 12 importers, and the two minimal-forced-edit comment
 * files). A future edit that reintroduces `FrenChip`/`FrenMenu`/
 * `FrenMenuFooter`/`FrenProfile`/`FrenProfileRoute`/`FrenNotFound`/
 * `useFrenSession`/`FrenSession`/`FrenAccount`/`applyFrenSession` into any
 * of these files trips this test instead of silently drifting back.
 *
 * Scope note: this does NOT assert repo-wide zero. At TASK-278's cut, a
 * handful of unowned prose comments elsewhere in the tree (`src/app/api/
 * admin/site/route.ts`, `src/components/NavMenu.tsx`, `src/components/
 * SiteFooter.tsx`, `src/hooks/useIsOperator.ts`, `src/hooks/
 * useNostrProfile.ts`, `src/lib/shiplog.ts` (an immutable ship's-log entry —
 * never edited), `tests/certcase-brand.test.ts`,
 * `tests/identity-space-no-frens-default.test.ts`) still name `FrenProfile`/
 * `FrenMenu` in passing; those files are outside this lane's OWNS and are
 * logged under this lane's SUMMARY.md ## Seams for a future lane to sweep.
 * `tests/operator-auth-email-seat.test.ts`'s `OperatorFrenSession` is a
 * different package's export (T-281's), and `tests/door-machine.test.ts`'s
 * own `.replace(/\b(use|apply)FrenSession\b/g, "")` deliberately still
 * spells the retired name once as a documented no-op strip (brief step 5) —
 * neither belongs in this pin.
 *
 * TASK-280 follow-through (0018.06.25 a₿): the session route handler (and
 * the "the header's MemberChip asks on every page load" docblock this pin
 * checks) moved from `src/app/api/frens/session/route.ts` to
 * `src/app/api/member/session/route.ts` — TASK-280 owns that move and left
 * a dual-read re-export shim at the old path (no comment of its own, just
 * `export { GET, POST, PUT, DELETE } from "@/app/api/member/session/route"`,
 * so the retired-identifier grep-zero check still trivially holds there).
 * The two checks below follow the docblock to its new home.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const OWNED_FILES = [
  "src/components/MemberProfile.tsx",
  "src/hooks/useMemberSession.ts",
  "src/app/u/[handle]/page.tsx",
  "src/app/u/[handle]/not-found.tsx",
  "src/app/login/signer-return/page.tsx",
  "src/components/BbConsole.tsx",
  "src/components/door/DoorButton.tsx",
  "src/components/door/DoorSheet.tsx",
  "src/components/me/MePanel.tsx",
  "src/components/OperatorGate.tsx",
  "src/components/ProfileEditor.tsx",
  "src/components/ReadWithLove.tsx",
  "src/components/ReleaseTag.tsx",
  "src/components/welcome/WelcomeFlow.tsx",
  "src/components/rooms/RoomVideoSlot.tsx",
  "src/app/api/member/session/route.ts",
  "tests/console.test.ts",
  "tests/operator-gate-email-seat.test.ts",
];

const OLD_IDENTIFIERS =
  /FrenChip|FrenMenu|FrenMenuFooter|FrenProfile|FrenProfileRoute|FrenNotFound|useFrenSession|FrenSession|FrenAccount|applyFrenSession/;

describe("TASK-278 — Fren* -> Member* rename, grep-zero in this lane's OWNS", () => {
  for (const rel of OWNED_FILES) {
    it(`${rel} carries no retired Fren* identifier`, () => {
      const src = readFileSync(path.join(ROOT, rel), "utf8");
      expect(src).not.toMatch(OLD_IDENTIFIERS);
    });
  }

  it("the renamed hook exports MemberSession/MemberAccount/applyMemberSession/useMemberSession", () => {
    const src = readFileSync(path.join(ROOT, "src/hooks/useMemberSession.ts"), "utf8");
    expect(src).toContain("export interface MemberSession");
    expect(src).toContain("export interface MemberAccount");
    expect(src).toContain("export function applyMemberSession(");
    expect(src).toContain("export default function useMemberSession()");
    /* the ruling (0018.06.25 a₿): the hook's own property renamed too */
    expect(src).toContain("return { member, accounts, checked, signOut, signOutOne, switchTo };");
  });

  it("the renamed profile component carries the new default export name (MemberChip/MemberMenu/MemberMenuFooter left the tree in TASK-286 — never rendered)", () => {
    expect(readFileSync(path.join(ROOT, "src/components/MemberProfile.tsx"), "utf8")).toContain(
      "export default function MemberProfile("
    );
    for (const gone of ["MemberChip", "MemberMenu", "MemberMenuFooter"]) {
      expect(existsSync(path.join(ROOT, `src/components/${gone}.tsx`))).toBe(false);
    }
  });

  it("the /u/[handle] route carries the renamed route function + not-found", () => {
    const page = readFileSync(path.join(ROOT, "src/app/u/[handle]/page.tsx"), "utf8");
    expect(page).toContain("export default async function MemberProfileRoute(");
    expect(page).toContain('import MemberProfile from "@/components/MemberProfile"');
    const notFound = readFileSync(path.join(ROOT, "src/app/u/[handle]/not-found.tsx"), "utf8");
    expect(notFound).toContain("export default function MemberNotFound()");
  });

  it("the two minimal-forced-edit comments outside OWNS were reworded, not left stale", () => {
    const roomSlot = readFileSync(path.join(ROOT, "src/components/rooms/RoomVideoSlot.tsx"), "utf8");
    expect(roomSlot).toContain("DoorButton/MemberProfile");
    const sessionRoute = readFileSync(path.join(ROOT, "src/app/api/member/session/route.ts"), "utf8");
    expect(sessionRoute).toContain("the header's DoorButton asks on every page load");
  });
});
