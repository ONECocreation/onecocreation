import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Packages } from "@/components/sections";

/* T-229 follow-through (0018.06.23 a₿): this page reads the site switches from KV;
   without this Next bakes it at build time and a switch Love flips never lands
   until the next deploy (the same line / and /store already carry). */
export const dynamic = "force-dynamic";

export default function PackagesPage() {
  return (<><SiteHeader /><main><Packages /></main><SiteFooter /></>);
}
