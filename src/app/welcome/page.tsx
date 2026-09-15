import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CosmicSky from "@/components/CosmicSky";
import WelcomeFlow from "@/components/welcome/WelcomeFlow";
import { safeNextPath } from "@/lib/next-path";

export const metadata: Metadata = {
  title: "Welcome home — One Cocreation",
  description: "What's yours now — your discovery call, the free circle, the store. The post-sign-in page, one short walk from the door.",
};

export const dynamic = "force-dynamic";

/**
 * /welcome — the post-sign-in "what's yours now" page (TASK-185 Phase B,
 * the Admiral's ruling 1, 0018.06.18 a₿): the URL keeps its place, linked
 * from the member menu. The two-breath walk (join / code / names) is
 * retired — the door sheet owns sign-up; a signed-out visitor is pointed
 * at /login, never asked the same email twice.
 *
 * TASK-259 (0018.06.24 a₿): a brand-new soul now always lands here first
 * (door-machine.ts's `landingFor`), carrying a same-origin `next` (e.g. the
 * reading room's own) as `?next=` on THIS url — read server-side here
 * (same `safeNextPath` validation `next-path.ts` already runs client-side
 * for the sheet, so a stray full URL or protocol-relative path can never
 * ride through) and handed down as a plain prop, never re-read from
 * `window` — no hydration seam, no client-only continue door.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next ?? null);
  return (
    <main>
      <SiteHeader />
      <section className="keep-dark sky-veil" style={{ padding: 0, position: "relative", overflow: "hidden", minHeight: "78vh" }}>
        <CosmicSky />
        <div className="wrap reveal" style={{ position: "relative", zIndex: 2, padding: "64px 22px 80px" }}>
          <WelcomeFlow next={next} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
