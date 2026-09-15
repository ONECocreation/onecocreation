import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * TASK-280 (0018.06.25 a₿, block 967,125) — the dual-read window itself,
 * pinned. The six member-session routes moved from `/api/frens/<name>` to
 * `/api/member/<name>`; the old URLs are left answering through a thin
 * re-export at the old file location — ONE implementation, TWO URLs, no
 * drift possible between them because there is nothing to drift: the old
 * file re-exports the exact same function object the new file defines.
 *
 * Two pins:
 *  1. per route, the old module's exported HTTP-verb handler(s) are the
 *     SAME function object as the new module's — not merely equal output,
 *     literally `===`, which is only true through a re-export.
 *  2. the source pin the Gates section names: zero `/api/frens/` literals
 *     remain in src/components, src/hooks, src/lib (every in-repo client
 *     call moved to /api/member/*; the six shim files under
 *     src/app/api/frens/* are expected to still carry the string — that's
 *     the dual-read window, not a leak, and is out of scope for this pin).
 */

type RouteModule = Record<string, unknown>;

/* static (non-templated) import() calls, one pair per route — dynamic
   import() with an interpolated specifier trips vite's dynamic-import-vars
   analysis (it wants a static file-extension part), and there are only six
   of these, so spelling each pair out keeps the resolver quiet and the
   intent obvious. */
const ROUTE_PAIRS: Array<{
  name: string;
  methods: string[];
  old: () => Promise<RouteModule>;
  next: () => Promise<RouteModule>;
}> = [
  {
    name: "availability",
    methods: ["GET"],
    old: () => import("@/app/api/frens/availability/route"),
    next: () => import("@/app/api/member/availability/route"),
  },
  {
    name: "claim",
    methods: ["POST"],
    old: () => import("@/app/api/frens/claim/route"),
    next: () => import("@/app/api/member/claim/route"),
  },
  {
    name: "release",
    methods: ["POST"],
    old: () => import("@/app/api/frens/release/route"),
    next: () => import("@/app/api/member/release/route"),
  },
  {
    name: "session",
    methods: ["GET", "POST", "PUT", "DELETE"],
    old: () => import("@/app/api/frens/session/route"),
    next: () => import("@/app/api/member/session/route"),
  },
  {
    name: "upload",
    methods: ["POST"],
    old: () => import("@/app/api/frens/upload/route"),
    next: () => import("@/app/api/member/upload/route"),
  },
  {
    name: "whois",
    methods: ["GET"],
    old: () => import("@/app/api/frens/whois/route"),
    next: () => import("@/app/api/member/whois/route"),
  },
];

describe("dual-read: old /api/frens/<name> re-exports the SAME handler as new /api/member/<name>", () => {
  for (const { name, methods, old, next } of ROUTE_PAIRS) {
    it(`${name}: every exported HTTP verb is the identical function object on both paths`, async () => {
      const oldMod = await old();
      const newMod = await next();
      expect(methods.length).toBeGreaterThan(0);
      for (const verb of methods) {
        expect(typeof newMod[verb], `${name} new module is missing ${verb}`).toBe("function");
        expect(oldMod[verb], `${name} old (frens) ${verb} !== new (member) ${verb}`).toBe(newMod[verb]);
      }
    });
  }
});

describe("source pin: no in-repo client code still calls the retired /api/frens/ URL shape", () => {
  const ROOTS = ["src/components", "src/hooks", "src/lib"];

  /* a small, dependency-free recursive .ts/.tsx walker — this pin needs no
     more than that, and keeps the test file self-contained. */
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full, out);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
    return out;
  }

  it("src/components, src/hooks, src/lib contain zero /api/frens/ literals", () => {
    const projectRoot = process.cwd();
    const offenders: string[] = [];
    for (const root of ROOTS) {
      const files = walk(join(projectRoot, root));
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        if (src.includes("/api/frens/")) {
          offenders.push(f);
        }
      }
    }
    expect(offenders, `files still carrying /api/frens/: ${offenders.join(", ")}`).toEqual([]);
  });
});
