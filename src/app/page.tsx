import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  Hero, About, Packages, Jewelry, Services, Classes, Affirmations, Donations, FreeMeditation, Contact,
} from "@/components/sections";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <About />
        <Packages />
        <Jewelry />
        <Services />
        <Classes />
        <Affirmations />
        <Donations />
        <FreeMeditation />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
