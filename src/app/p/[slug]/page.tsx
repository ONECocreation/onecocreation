import { notFound } from "next/navigation";
import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import { config } from "@/lib/puck-config";
import { getPuckPage } from "@/lib/puck-store";
import PaletteVars from "@/components/PaletteVars";

/**
 * /p/<slug> — the render proof (PUCK P1): a page composed in the studio
 * (/a/studio/<slug>) actually appears here for everyone, server-rendered
 * straight from KV via Puck's <Render>. No operator gate — this is the
 * PUBLISHED output, same as any other page on the site. 404s when nothing's
 * been saved for the slug yet (nothing to render).
 */
export const dynamic = "force-dynamic";

export default async function PublishedPuckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPuckPage(slug);
  if (!data) notFound();

  return (
    <>
      <PaletteVars />
      <Render config={config} data={data as Data} />
    </>
  );
}
