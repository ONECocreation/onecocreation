import ArcadeFonts from "@/components/ArcadeFonts";

/* The arcade skin's display face scoped to /welcome (QW9) — the flow renders
   TagClaim (arcade skin) inside the celestial shell. */
export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return <ArcadeFonts>{children}</ArcadeFonts>;
}
