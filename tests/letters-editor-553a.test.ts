import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * T-604 (letters 553a): source pins for the letter page and its parts. The
 * environment is node (no jsdom), so these read the source, the same way the
 * room's own pins do.
 */
const read = (rel: string) => readFileSync(resolve(__dirname, "..", rel), "utf8");
const PAGE = "src/app/a/letters/[key]/edit/page.tsx";
const NEW_FILES = [PAGE, "src/components/letters/LetterCanvas.tsx", "src/components/letters/TextBlock.tsx"];
/* this lane's owned source files, the .ts/.tsx/.css ones */
const OWNED = [
  ...NEW_FILES,
  "src/lib/letter-model.ts",
  "src/app/a/letters/page.tsx",
  "src/app/api/admin/letters/copy/route.ts",
  "src/app/kit.css",
];

describe("the letter page is built on the kit", () => {
  for (const f of NEW_FILES) {
    it(`${f}: no style=, no hex colour`, () => {
      const src = read(f);
      expect(src).not.toMatch(/\bstyle=/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  }
  it("the page root wrapper is the one root padding", () => {
    expect(read(PAGE)).toMatch(/className="p-6 text-sm"/);
  });
  it("the page uses the kit Button and Field, and names no long dash", () => {
    const src = read(PAGE);
    expect(src).toContain('from "@/components/kit"');
    for (const f of [...NEW_FILES, "src/lib/letter-model.ts"]) expect(read(f), f).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("the lint: no raw house button class in an owned file", () => {
  for (const f of OWNED) {
    it(`${f} has no className="btn or className={\`btn`, () => {
      const lines = read(f).split("\n");
      const hits = lines.flatMap((l, i) => (/className="btn|className=\{`btn/.test(l) ? [`${f}:${i + 1}`] : []));
      expect(hits).toEqual([]);
    });
  }
});

describe("the inbox check", () => {
  it('the preview iframe carries sandbox="" and no style=, in the kitx-frame class', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<iframe[^>]*sandbox=""/);
    expect(src).toContain('className="kitx-frame"');
    expect(src).toContain("/api/admin/letters/preview");
    expect(src).toContain("}, 300)"); // the room's 300 ms debounce
  });
});

describe("Publish and Save draft", () => {
  const src = read(PAGE);
  it("Publish sends publish: true, Save draft does not (the same PUT the room calls)", () => {
    expect(src).toContain('method: "PUT"');
    expect(src).toContain("{ key, subject, body, publish: true }");
    expect(src).toContain("{ key, subject, body }");
    expect(src).toMatch(/onClick=\{\(\) => put\(true\)\}[^>]*>Publish</);
    expect(src).toMatch(/onClick=\{\(\) => put\(false\)\}[^>]*>Save draft</);
  });
  it("Save draft shows only where the room shows it (isDrafted), Publish on every editable letter", () => {
    expect(src).toMatch(/isDrafted\(key, letter\) && \(\s*<Button sm variant="second" onClick=\{\(\) => put\(false\)\}/);
    expect(src).toContain("Publishing makes this the version that sends.");
    expect(src).not.toContain("noPublish");
  });
  it("the notes reuse the room's words", () => {
    expect(src).toContain("Published. This is the version that sends.");
    expect(src).toContain("Draft saved. It stays in Drafted, and nothing sends until you press Publish.");
  });
  it("an unsaved edit asks before the page is left, and nothing saves on its own", () => {
    expect(src).toContain('addEventListener("beforeunload"');
    expect(src.match(/method: "PUT"/g)?.length).toBe(1); // one PUT, inside put()
  });
  it("a system letter that is not in the list is fixed in code", () => {
    expect(src).toContain("This letter is fixed in code");
  });
  it("the test copy posts the screen's words to the editor mode", () => {
    expect(src).toContain("fromEditor: true, key, subject, body");
  });
});

describe("the room points at the page", () => {
  const room = read("src/app/a/letters/page.tsx");
  it("Edit is a link to /a/letters/<key>/edit in the Send link's kit classes", () => {
    expect(room).toContain("href={`/a/letters/${key}/edit`}");
    expect(room).toMatch(/kit-btn \$\{o\.main \? "kit-btn-main" : "kit-btn-second"\} kit-btn-sm/);
  });
  it("a new letter opens on its own page", () => {
    expect(room).toContain("window.location.assign(`/a/letters/${res.key}/edit`)");
  });
  it("the four raw buttons in the inline editor are kit Buttons now", () => {
    expect(room).not.toMatch(/<button[^>]*className="btn/);
    for (const w of ["Reading room", "Site picture", "PUBLISH"]) expect(room).toContain(w);
  });
  it("the LETTERS array is untouched in this lane (T-582 edits those lines)", () => {
    expect(room).toContain("const LETTERS");
  });
});

describe("the text block", () => {
  const src = read("src/components/letters/TextBlock.tsx");
  it("is TipTap with only the stored format's extensions, pinned in package.json", () => {
    for (const ext of ["Document", "Paragraph", "Text", "Bold", "Italic", "HardBreak", "UndoRedo", "Slot", "Link.configure"]) expect(src).toContain(ext);
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    for (const n of ["react", "extension-document", "extension-paragraph", "extension-text", "extension-bold", "extension-italic", "extension-link", "extension-hard-break", "extensions"])
      expect(pkg.dependencies[`@tiptap/${n}`], n).toBe("3.30.5");
  });
  it("the format bar is three icon squares with names, and Ctrl+K opens the link box", () => {
    for (const w of ['aria-label="Bold"', 'aria-label="Italic"', 'aria-label="Add a link"']) expect(src).toContain(w);
    expect(src).toContain("ctrlKey || e.metaKey");
  });
  it("the link box refuses with the plain words", () => {
    expect(src).toContain("LINK_REFUSAL");
    expect(read("src/lib/letter-model.ts")).toContain("Links start with https:// (another site) or with / (a page on this site).");
  });
  it("the link box keeps one button beside the field and Remove link on its own row (round 2)", () => {
    const css = read("src/app/kit.css");
    expect(css).toContain(".kitx-block .kit-inline-form .kit-field-input:focus-visible{outline-offset:-2px}");
    expect(css).toContain(".kitx-block .kit-inline-form:has(>.kit-field)>.kit-btn-second{grid-column:1/-1;grid-row:4;justify-self:start}");
    expect(css).toContain("@media (max-width:640px){.kitx-block .kit-inline-form:has(>.kit-field)>.kit-btn-second{grid-column:1;grid-row:auto;justify-self:center}}");
    expect(src).toContain('<Button type="submit" sm>');
  });
  it("the Heaven and Earth script on the canvas wears the same stroke as /about (round 3)", () => {
    const canvas = read("src/components/letters/LetterCanvas.tsx");
    expect(canvas).toContain('className={hero === cartridge.hero.heavenEarth ? "about-script" : undefined}');
    expect(read("src/app/house.css")).toContain(".about-script{filter:drop-shadow(.5px 0 0 #fff)");
  });
  it("round 4: the site's own logo, uniform card pictures, a plain Unsubscribe link, centred phone controls", () => {
    const canvas = read("src/components/letters/LetterCanvas.tsx");
    const css = read("src/app/kit.css");
    expect(canvas).toContain("cartridge.logo.lockup");
    expect(canvas).not.toContain("kit-btn-second kit-btn-sm\" aria-hidden=\"true\">Unsubscribe");
    expect(canvas).toContain("kitx-letter-unsub");
    expect(css).toContain(".kitx-letter-card>img{width:180px;flex:0 0 180px;aspect-ratio:1;object-fit:cover;");
    expect(css).toContain(".kitx-pane>.kit-btn-row{justify-content:center}");
    expect(read("src/lib/mail.ts")).toContain('text-align:right;font-family:Arial,sans-serif;font-size:12px;"><a href="${letter.unsubscribeUrl}"');
    const seed = read("src/lib/letters.ts");
    expect(seed).toContain("popup-free-guide/unzip-9141826.png | /meditation |");
    expect(seed).toContain("!cta: Open the News page | /news");
  });
  it("the canvas loads the editor in the browser only", () => {
    const canvas = read("src/components/letters/LetterCanvas.tsx");
    expect(canvas).toContain("ssr: false");
    expect(canvas).toContain("Fixed part: the header");
    expect(canvas).toContain("Fixed part: the footer");
    expect(canvas).toContain("changed in the next part, kept exactly as written");
  });
});
