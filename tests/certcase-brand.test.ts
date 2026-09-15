import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CertCase from "@/components/CertCase";
import type { Cert } from "@/lib/certs";

/**
 * TASK-271 (0018.06.24 a₿ · block 967,055) — the most visible old word in
 * the repo: CertCase's brand strip rendered "PAC'S ARCADE · CERT" on the
 * PUBLIC /u/[handle] page (FrenProfile's cert shelf). It now reads the
 * live cartridge's own product name, uppercased, so a future fork never
 * has to hunt this literal down again.
 */

const CERT: Cert = {
  code: "SOCIAL101",
  title: "Social Basics",
  etchedAt: 967055, // real tip height at cut, mempool.space/api/blocks/tip/height
};

describe("CertCase — the brand strip wears the site's own name (T-271)", () => {
  it("never renders the old house's name", () => {
    const html = renderToStaticMarkup(createElement(CertCase, { cert: CERT }));
    expect(html.toUpperCase()).not.toContain("PAC'S ARCADE");
    expect(html.toUpperCase()).not.toContain("PAC&#39;S ARCADE");
  });

  it("renders the live cartridge's product name on the brand strip", () => {
    const html = renderToStaticMarkup(createElement(CertCase, { cert: CERT }));
    expect(html).toContain("ONE COCREATION · CERT");
  });
});
