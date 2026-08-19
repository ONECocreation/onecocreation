import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import { config } from "@/lib/puck-config";
import { getPuckPage, type PuckPageData } from "@/lib/puck-store";
import { cartridge } from "@/brand/cartridge";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaletteVars from "@/components/PaletteVars";
import PopupHost from "@/components/PopupHost";

/**
 * /p/<slug> — the render proof (PUCK P1): a page composed in the studio
 * (/studio/<slug>) actually appears here for everyone, server-rendered
 * straight from KV via Puck's <Render>. No operator gate — this is the
 * PUBLISHED output, same as any other page on the site. 404s when nothing's
 * been saved for the slug yet (nothing to render).
 *
 * STUDIO P1 made it a REAL page: it wears the public shell (SiteHeader /
 * SiteFooter, same composition as the hand-built pages' puck branch) and
 * its metadata comes from the Puck root props the operator set in the
 * studio, falling back to the cartridge meta.
 */

export const dynamic = "force-dynamic";

/* Root props tolerance: today's data may be `root: {}`, `root: { props }`,
   or (deprecated) props straight on root — Puck migrates on the next save. */
interface PuckRootProps {
  title?: string;
  description?: string;
  ogImage?: string;
}

function rootProps(data: PuckPageData): PuckRootProps {
  const root = data.root as ({ props?: PuckRootProps } & PuckRootProps) | undefined;
  return (root?.props ?? root ?? {}) as PuckRootProps;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPuckPage(slug);
  /* nothing published → the page 404s below; metadata stays the cartridge's */
  if (!data) return { title: cartridge.meta.title };
  const p = rootProps(data);
  return {
    title: p.title || cartridge.meta.title,
    description: p.description || cartridge.meta.description,
    openGraph: p.ogImage ? { images: [p.ogImage] } : undefined,
  };
}

export default async function PublishedPuckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  /* namespaced lanes (popup: — STUDIO P2) are fragments for the overlay
     system, never public pages: they render through PopupHost only */
  if (slug.includes(":")) notFound();
  const data = await getPuckPage(slug);
  if (!data) notFound();

  return (
    <>
      <SiteHeader />
      <PaletteVars />
      <main><Render config={config} data={data as Data} /></main>
      <SiteFooter />
      {/* gate ruling 0018.05.25 a₿: a built page is a REAL page, popups
          included — PopupHost no-ops unless a trigger lists this path */}
      <PopupHost />
    </>
  );
}
