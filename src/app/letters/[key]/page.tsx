import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  LETTER_DEFAULTS,
  audienceOf,
  getLetterOverride,
  isLetterKey,
  letterAudienceGate,
  letterHtml,
  type LetterKey,
  type LetterOverride,
} from "@/lib/letters";
import { sessionsFromCookieHeader } from "@/lib/member-auth";
import { operatorFromCookieHeader } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

/**
 * /letters/<key> — every letter's page on the site (Admiral, 0018.05.18):
 * the email's links land HERE, notes living inside the page, and a letter
 * is readable long after the inbox buried it.
 *
 * TASK-494: members-only stays members-only. audienceOf names the letter's
 * audience; the pure letterAudienceGate decides who may read it — a
 * signed-in member (any valid session, tier or none: TASK-535, a free
 * email member reads their letters) or the operator —
 * and everyone else gets the same plain 404 a bad key gets, never a
 * sign-in teaser (a teaser would confirm the letter exists). The gate is
 * resolved ONCE per request below and metadata wears it too, so a
 * members-only subject never leaks into the tab or a link preview.
 */

/** The ONE wiring of the gate: session + operator from the cookie header
 *  (the rooms/reading idiom); no session is not a member (fail closed),
 *  the verdict comes from letterAudienceGate alone. */
async function letterGate(key: string, override: LetterOverride | null) {
  const audience = audienceOf(key, override);
  const cookie = (await headers()).get("cookie");
  const operator = !!operatorFromCookieHeader(cookie);
  const session = sessionsFromCookieHeader(cookie)[0] ?? null;
  return letterAudienceGate({ audience, signedIn: !!session, operator });
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  if (!(await isLetterKey(key))) return { title: "Letters — One Cocreation" };
  const override = await getLetterOverride(key);
  // the gate covers metadata too: gated visitors get the same generic
  // title the bad-key path returns — the subject stays sealed
  if ((await letterGate(key, override)) === "not-found") return { title: "Letters — One Cocreation" };
  const tpl = override ?? LETTER_DEFAULTS[key as LetterKey];
  return { title: `${tpl?.subject ?? "A letter"} — One Cocreation` };
}

export default async function LetterPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(await isLetterKey(key))) notFound();
  const override = await getLetterOverride(key);
  const tpl = override ?? LETTER_DEFAULTS[key as LetterKey];
  if (!tpl) notFound();
  if ((await letterGate(key, override)) === "not-found") notFound();

  return (
    <main>
      <SiteHeader />
      <section className="wrap" style={{ maxWidth: 680 }}>
        {/* the letter IS the page — same html the inbox got */}
        <div
          style={{ borderRadius: 20, overflow: "hidden", background: "var(--cream)", boxShadow: "0 30px 70px -24px rgba(5,3,16,.8)", margin: "10px 0 30px" }}
          dangerouslySetInnerHTML={{ __html: letterHtml(tpl.body, { webUrl: `/letters/${key}` }) }}
        />
      </section>
      <SiteFooter />
    </main>
  );
}
