import ArcadeFonts from "@/components/ArcadeFonts";

/* The arcade skin's display face scoped to /time (QW9) — the orrery study
   pages wear pixel type; the celestial root no longer ships it. */
export default function TimeLayout({ children }: { children: React.ReactNode }) {
  return <ArcadeFonts>{children}</ArcadeFonts>;
}
