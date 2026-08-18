import ArcadeFonts from "@/components/ArcadeFonts";

/* The arcade skin's display face scoped to the member-profile routes (QW9 —
   covers page + not-found/GameOverTag). */
export default function HandleLayout({ children }: { children: React.ReactNode }) {
  return <ArcadeFonts>{children}</ArcadeFonts>;
}
