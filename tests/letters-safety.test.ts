import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { letterAudienceGate, audienceOf, bodyToHtml, letterHtml } from "@/lib/letters";

/**
 * TASK-494 — letters safety: members-only letters stay members-only.
 *
 * Three fixes, pinned here:
 *   1. THE AUDIENCE GATE. `letterAudienceGate` (pure, beside audienceOf in
 *      src/lib/letters.ts) is the ONE truth table for who may read a letter
 *      on the site: a members-audience letter renders only for a signed-in
 *      member (any valid session, tier or none since TASK-535) or the operator; everyone
 *      else — signed out, or the signed-in NON-member state that really
 *      exists (the email-space subscriber session, Ground truth) — is
 *      gated. Public letters render for everyone (the /news shelf keeps
 *      working).
 *   2. THE QUOTE FIX. bodyToHtml's escape pass gains `"` -> `&quot;`, and
 *      the directive values letterHtml parses (!hero/!section/!cta) are
 *      escaped before they reach richShell, so a quote can never close the
 *      attribute the shell writes the value into. Directive URLs admit a
 *      single-`/` site path or an explicit https:// URL ONLY (the T-227
 *      rule, per T-491's security review); anything else falls to literal
 *      text, exactly like bodyToHtml's link handling.
 *   3. THE SOURCE PINS (house idiom): /letters/[key]/page.tsx wires the
 *      gate in the page AND in generateMetadata (the subject stops
 *      leaking), and the /a/letters preview iframe carries sandbox="".
 *
 * The stricter reading of letters.ts:12's comment ("only readers who
 * actually received it") is NOT this lane: K126's ruled shape gates at
 * membership, not per-recipient mailbox. Flagged for the Admiral in SUMMARY.
 */

describe("letterAudienceGate — the members-only truth table", () => {
  it("(a) a members letter is gated for a signed-out visitor", () => {
    expect(letterAudienceGate({ audience: "members", signedIn: false, operator: false })).toBe("not-found");
  });

  it("(b) TASK-535: a members letter RENDERS for any signed-in session, tier or none (the free email member reads their letters)", () => {
    expect(letterAudienceGate({ audience: "members", signedIn: true, operator: false })).toBe("render");
  });

  it("(c) a members letter renders for a signed-in member, and for the operator (signed out or not)", () => {
    expect(letterAudienceGate({ audience: "members", signedIn: true, operator: false })).toBe("render");
    expect(letterAudienceGate({ audience: "members", signedIn: false, operator: true })).toBe("render");
    expect(letterAudienceGate({ audience: "members", signedIn: true, operator: true })).toBe("render");
  });

  it("(d) a public letter renders for everyone, signed out included — the /news shelf keeps working", () => {
    expect(letterAudienceGate({ audience: "public", signedIn: false, operator: false })).toBe("render");
    expect(letterAudienceGate({ audience: "public", signedIn: true, operator: false })).toBe("render");
  });

  it("audienceOf still fails closed to members for an unknown key (the gate never sees a loose audience)", () => {
    expect(audienceOf("no-such-letter", null)).toBe("members");
  });
});

describe('the " fix — a quote can never close an attribute', () => {
  it("(e) bodyToHtml: a quote in a link URL escapes to &quot; inside the attribute, the raw breakout never appears", () => {
    const html = bodyToHtml('[x](https://evil.test/"onmouseover="alert(1))');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('" onmouseover="');
  });

  it("(e) bodyToHtml: the image form escapes the same way", () => {
    const html = bodyToHtml('![alt](https://evil.test/"onerror="alert(1))');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('" onerror="');
  });

  it("(e) letterHtml: a !hero carrying a quote emits no unescaped quote into the attribute", () => {
    const html = letterHtml('!hero: /images/x.webp"onerror="alert(1)\n\nBody words.');
    expect(html).toContain("&quot;onerror=&quot;");
    expect(html).not.toContain('webp"onerror="');
  });

  it("(e) letterHtml: a !section carrying quotes in href and title is escaped end to end", () => {
    const html = letterHtml('!section: A "quoted" title | /images/x.webp | /go"x | the blurb\n\nBody words.');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('go"x');
    expect(html).not.toContain('A "quoted" title');
  });

  it("(e) letterHtml: a !cta href carrying a quote escapes inside the pill", () => {
    const html = letterHtml('!cta: Go | /store"onmouseover="alert(1)\n\nBody words.');
    expect(html).toContain("&quot;onmouseover=&quot;");
    expect(html).not.toContain('store"onmouseover="');
  });

  it("(e) the cta label and section blurb escape as content, not just attributes", () => {
    const html = letterHtml('!cta: Go <b>now</b> | /store\n\nBody words.');
    expect(html).not.toContain("Go <b>now</b>");
    expect(html).toContain("Go &lt;b&gt;now&lt;/b&gt;");
  });
});

describe("the directive href policy (T-227's rule at the directive boundary, T-491's review)", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://fixture.example";
  });

  it("a single-/ site path rides through (cta)", () => {
    const html = letterHtml("!cta: Go | /store\n\nBody words.");
    expect(html).toContain('href="https://fixture.example/store"');
    expect(html).not.toContain("!cta:");
  });

  it("an explicit https:// URL rides through (cta)", () => {
    const html = letterHtml("!cta: Go | https://example.com/x\n\nBody words.");
    expect(html).toContain('href="https://example.com/x"');
    expect(html).not.toContain("!cta:");
  });

  it("javascript: in a cta href falls to literal text — never a link", () => {
    const html = letterHtml("!cta: Go | javascript:alert(1)\n\nBody words.");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("!cta: Go | javascript:alert(1)");
  });

  it("a scheme-relative //host cta href falls to literal text", () => {
    const html = letterHtml("!cta: Go | //evil.test/x\n\nBody words.");
    expect(html).not.toContain('href="//evil.test');
    expect(html).toContain("!cta: Go | //evil.test/x");
  });

  it("a bare-word cta href falls to literal text", () => {
    const html = letterHtml("!cta: Go | store\n\nBody words.");
    expect(html).toContain("!cta: Go | store");
  });

  it("an http:// (not https) cta href falls to literal text — the policy is explicit-https only", () => {
    const html = letterHtml("!cta: Go | http://evil.test/x\n\nBody words.");
    expect(html).not.toContain('href="http://evil.test');
    expect(html).toContain("!cta: Go | http://evil.test/x");
  });

  it("a !hero with a non-admitted URL renders no hero image and falls to literal text", () => {
    const html = letterHtml("!hero: javascript:alert(1)\n\nBody words.");
    expect(html).not.toContain('src="javascript:');
    expect(html).toContain("!hero: javascript:alert(1)");
  });

  it("a !section whose href fails the policy falls to literal text as a whole line", () => {
    const html = letterHtml("!section: T | /images/x.webp | javascript:alert(1) | blurb\n\nBody words.");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("!section: T | /images/x.webp | javascript:alert(1) | blurb");
  });

  it("a !section whose IMAGE fails the policy falls to literal text — every URL field is gated", () => {
    const html = letterHtml("!section: T | javascript:alert(1) | /go | blurb\n\nBody words.");
    expect(html).not.toContain('src="javascript:');
    expect(html).toContain("!section: T | javascript:alert(1) | /go | blurb");
  });
});

describe("(g) the neighbours stay true — T-227's literal-text pins, re-asserted at this seam", () => {
  it("javascript: in a body link stays literal text, never a link", () => {
    const html = bodyToHtml("[click](javascript:alert(1))");
    expect(html).not.toContain("<a href");
    expect(html).toContain("[click](javascript:alert(1))");
  });

  it("mailto: stays literal text", () => {
    const html = bodyToHtml("[email me](mailto:love@example.com)");
    expect(html).not.toContain("<a href");
    expect(html).toContain("[email me](mailto:love@example.com)");
  });

  it("a scheme-relative //host link stays literal text", () => {
    const html = bodyToHtml("[door](//evil.example/x)");
    expect(html).not.toContain("<a href");
    expect(html).toContain("[door](//evil.example/x)");
  });
});

describe("(f) source pins — the page wires the gate, the iframe wears the sandbox", () => {
  const PAGE = "src/app/letters/[key]/page.tsx";
  const ADMIN = "src/app/a/letters/page.tsx";

  it("the letter page reads the session, admits the operator, resolves via audienceOf, 404s via notFound()", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).toContain("sessionsFromCookieHeader");
    expect(src).not.toContain("tierForSubject"); // T-535: no tier read
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain("audienceOf");
    expect(src).toContain("letterAudienceGate");
    expect(src).toContain("notFound()");
  });

  it("generateMetadata wears the same gate — the members-only subject stops leaking in the tab and link previews", () => {
    const src = readFileSync(PAGE, "utf8");
    const metaStart = src.indexOf("export async function generateMetadata");
    const pageStart = src.indexOf("export default");
    expect(metaStart).toBeGreaterThan(-1);
    expect(pageStart).toBeGreaterThan(metaStart);
    const meta = src.slice(metaStart, pageStart);
    // the metadata block wires the same gate wiring (letterGate, the
    // page-local wiring of letterAudienceGate — never a re-derived check)
    expect(meta).toContain("letterGate(");
    // the gated path returns the generic title, never the subject
    expect(meta).toContain("Letters — One Cocreation");
    expect(meta).not.toContain("tpl.subject");
  });

  it("the page body gates through the same helper and 404s on the gated path", () => {
    const src = readFileSync(PAGE, "utf8");
    const body = src.slice(src.indexOf("export default"));
    expect(body).toContain("letterGate(");
    expect(body).toContain("notFound()");
  });

  it("the gate wiring itself is letterAudienceGate fed by audienceOf — never a re-derived audience", () => {
    const src = readFileSync(PAGE, "utf8");
    const wireStart = src.indexOf("async function letterGate(");
    expect(wireStart).toBeGreaterThan(-1);
    const wire = src.slice(wireStart, src.indexOf("export async function generateMetadata"));
    expect(wire).toContain("audienceOf(");
    expect(wire).toContain("letterAudienceGate(");
    expect(wire).not.toContain("tierForSubject");
    expect(wire).not.toContain("isMember");
    expect(wire).toContain("operatorFromCookieHeader");
    expect(wire).toContain("sessionsFromCookieHeader");
    // fail closed — no session is not a member
    expect(wire).toContain("signedIn: !!session");
  });

  it('the /a/letters preview iframe carries sandbox="" — every capability denied', () => {
    const src = readFileSync(ADMIN, "utf8");
    expect(src).toMatch(/<iframe[^>]*sandbox=""/);
  });
});
