import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { basketContact, basketGatedLine } from "@/lib/basket-contact";

/**
 * TASK-210 (0018.06.23 a₿ — Love's 0018.06.18 call, 00:23:40 / 00:45:33:
 * "the basket asks for an email while the visitor is signed in"). Pins the
 * MODEL, not the render (the house idiom): what the basket asks, whose
 * mailbox the checkout carries, and what the gated line says — for a
 * guest, an email member, a key member. Plus a source pin that CartPanel
 * reads the session the header reads (session-read.ts, the T-177 helper)
 * and derives every one of those from this helper, never a second rule.
 */

const guest = null;
const emailMember = { handle: "firefly@example.com", space: "email", name: "firefly" };
const keyMember = { handle: "ada", space: "frens", name: "ada" };

describe("TASK-210 — the basket's contact line", () => {
  it("a guest is asked for an email; what they typed rides along, trimmed", () => {
    expect(basketContact(guest, "")).toEqual({ askEmail: true, email: null, line: null });
    expect(basketContact(guest, "  reader@example.com ")).toEqual({
      askEmail: true, email: "reader@example.com", line: null,
    });
  });

  it("an EMAIL member is never asked — the receipt goes to the mailbox that answered the code, and the line names them", () => {
    const c = basketContact(emailMember, "");
    expect(c.askEmail).toBe(false);
    expect(c.email).toBe("firefly@example.com");
    expect(c.line).toContain("Signed in as firefly");
    expect(c.line).toContain("firefly@example.com");
    // typed text can't override the session's own mailbox (there is no field)
    expect(basketContact(emailMember, "other@example.com").email).toBe("firefly@example.com");
  });

  it("a KEY member keeps an OPTIONAL field (no mailbox on file) — named, never told to sign in", () => {
    const c = basketContact(keyMember, "");
    expect(c.askEmail).toBe(true);
    expect(c.email).toBeNull();
    expect(c.line).toContain("Signed in as ada");
    expect(c.line).toContain("only if");
    expect(c.line?.toLowerCase()).not.toContain("sign in");
    expect(basketContact(keyMember, "ada@example.com").email).toBe("ada@example.com");
  });

  it("the gated line invites a guest in, and tells a member what unlocks for THEM — never 'sign in' to someone already in", () => {
    expect(basketGatedLine(guest)).toContain("sign in");
    const member = basketGatedLine(emailMember);
    expect(member).toContain("firefly");
    expect(member.toLowerCase()).not.toContain("sign in");
  });

  it("CartPanel reads the header's own session and derives the field, the mailbox and the gated line from this helper (source pin)", async () => {
    const src = await fs.readFile(path.join(process.cwd(), "src/components/store/CartPanel.tsx"), "utf8");
    expect(src).toContain('from "@/lib/session-read"'); // the ONE session read (T-177)
    expect(src).toContain("readSession()");
    expect(src).toContain("basketContact(memberSession, email)"); // the field + the mailbox
    expect(src).toContain("{basketGatedLine(memberSession)}"); // the gated line
    expect(src).toContain("{contact.askEmail && ("); // the field renders only when asked
    // the old hardwired gated words are gone — the helper says them
    expect(src).not.toContain("sign in, or just add your email below: it becomes your account.\n");
  });
});
