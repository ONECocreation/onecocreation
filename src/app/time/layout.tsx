import ArcadeFonts from "@/components/ArcadeFonts";

/* The arcade display face scoped to /time (QW9). The orrery study pages
   that needed it moved out with the transplant (transplant/frens-earth-time,
   0018.05.26 a₿); the placeholder clock wears the house cartridge, but the
   scoped font stays — the future face for this door may still want it. */
export default function TimeLayout({ children }: { children: React.ReactNode }) {
  return <ArcadeFonts>{children}</ArcadeFonts>;
}
