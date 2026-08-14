import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { FreeMeditation } from "@/components/sections";

export const metadata: Metadata = {
  title: "Free Meditation — One Cocreation",
  description: "A free guided meditation from Love — a gift, no strings.",
};

/* The free meditation wears two doors (Admiral, 0018.05.16): a section on
 * the main page AND its own page — same pattern as About. */
export default function MeditationPage() {
  return (<><SiteHeader /><main><FreeMeditation /></main><SiteFooter /></>);
}
