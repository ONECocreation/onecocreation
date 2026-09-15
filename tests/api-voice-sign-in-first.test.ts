import { describe, it, expect } from "vitest";

/**
 * TASK-272 (L5 api-voice, bin A) — the three "sign in first, fren" JSON
 * error strings speak plain ONE Cocreation words now: "sign in first",
 * matching the house's existing sibling gates (member/link-email, already
 * clean). Route paths, symbols and the frens/media/ blob prefix are
 * untouched (bin B stays HOLD) — this pins the wire string only.
 */

describe("POST /api/frens/release — signed-out reason", () => {
  it("reads 'sign in first', never 'fren'", async () => {
    const { POST } = await import("@/app/api/frens/release/route");
    const res = await POST(new Request("http://localhost/api/frens/release", { method: "POST" }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.reason).toBe("sign in first");
  });
});

describe("PUT /api/frens/session — signed-out reason", () => {
  it("reads 'sign in first', never 'fren'", async () => {
    const { PUT } = await import("@/app/api/frens/session/route");
    const res = await PUT(
      new Request("http://localhost/api/frens/session", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: "someone", space: "email" }),
      })
    );
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.reason).toBe("sign in first");
  });
});

describe("POST /api/frens/upload — signed-out reason", () => {
  it("reads 'sign in first', never 'fren'", async () => {
    const { POST } = await import("@/app/api/frens/upload/route");
    const res = await POST(new Request("http://localhost/api/frens/upload", { method: "POST" }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.reason).toBe("sign in first");
  });
});
