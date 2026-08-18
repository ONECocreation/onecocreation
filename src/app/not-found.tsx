import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Page not found — One Cocreation",
};

/** The lost page, in Love's voice — de-housed 0018.05.15 (the arcade
 *  cabinet 404 was the last frens residue the live sweep could find). */
export default function NotFound() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <div className="mgmt-wrap" style={{ maxWidth: 560, textAlign: "center", paddingTop: 80 }}>
        <p className="kicker" style={{ textAlign: "center" }}>404</p>
        <h1 className="sec-h">This page isn&apos;t here.</h1>
        <p style={{ color: "var(--muted)", margin: "16px 0 28px" }}>
          Whatever you were reaching for has moved on, or never was. The field is still here —
          come back to the center.
        </p>
        <Link className="btn" href="/">
          Return home
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
