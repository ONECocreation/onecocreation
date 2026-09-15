import DisplayFonts from "@/components/DisplayFonts";

/* The template display face scoped to the member-profile routes (QW9 —
   covers page + not-found/GameOverTag). */
export default function HandleLayout({ children }: { children: React.ReactNode }) {
  return <DisplayFonts>{children}</DisplayFonts>;
}
