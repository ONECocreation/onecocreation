import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MediaKit from "@/components/MediaKit";

/**
 * /media — the MEDIA / ASSETS page: copy-to-clipboard bitcoin glyphs
 * (₿, the sat mark, a₿ / b₿ / ▣, ⚡), the One Cocreation brand assets (mark,
 * wordmark, palette), and a press blurb. So nobody has to leave home to grab
 * a ₿. Gold rides money only.
 */
export const metadata: Metadata = {
  title: "Media & assets — One Cocreation",
  description:
    "Copy bitcoin glyphs (₿, sats, a₿, ▣, ⚡) and One Cocreation brand assets — the mark, wordmark, palette, and a press blurb. No trip to emojipedia required.",
};

export default function MediaPage() {
  return (
    <main className="mgmt-ground">
      <SiteHeader />
      <section className="mgmt-wrap mgmt-body" style={{ maxWidth: 880 }}>
        <MediaKit />
      </section>
      <SiteFooter />
    </main>
  );
}
