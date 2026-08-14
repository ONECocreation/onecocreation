import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { EDITABLE_LETTERS, LETTER_DEFAULTS, getLetterOverride, letterHtml, type LetterKey } from "@/lib/letters";

export const dynamic = "force-dynamic";

/**
 * /letters/<key> — every letter's page on the site (Admiral, 0018.05.18):
 * the email's links land HERE, notes living inside the page, and a letter
 * is readable long after the inbox buried it.
 */
const isKey = (k: string): k is LetterKey => (EDITABLE_LETTERS as readonly string[]).includes(k);

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  if (!isKey(key)) return { title: "Letters — One Cocreation" };
  const tpl = (await getLetterOverride(key)) ?? LETTER_DEFAULTS[key];
  return { title: `${tpl?.subject ?? "A letter"} — One Cocreation` };
}

export default async function LetterPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isKey(key)) notFound();
  const tpl = (await getLetterOverride(key)) ?? LETTER_DEFAULTS[key];
  if (!tpl) notFound();

  return (
    <main>
      <SiteHeader />
      <section className="wrap" style={{ maxWidth: 680 }}>
        {/* the letter IS the page — same html the inbox got */}
        <div
          style={{ borderRadius: 20, overflow: "hidden", background: "#FBF6EF", boxShadow: "0 30px 70px -24px rgba(5,3,16,.8)", margin: "10px 0 30px" }}
          dangerouslySetInnerHTML={{ __html: letterHtml(tpl.body, { webUrl: `/letters/${key}` }) }}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
